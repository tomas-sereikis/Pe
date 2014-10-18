(function () {
    var root = this;

    /**
     * @name StackClosedError
     * @constructor
     */
    function StackClosedError() { }
    StackClosedError.prototype = new Error();

    /**
     * @param {Function} fn
     * @throw {TypeError}
     */
    var validateCallback = function (fn) {
        // check if evaluator is valid
        if (typeof fn !== 'function') {
            throw new TypeError();
        }
    };

    /**
     * @param {{worker: Function, params: Array}} process
     * @param {Function} done
     * @param {Function} fail
     */
    var triggerWorkerProcess = function (process, done, fail) {
        // set default async off
        var async = false;
        var canceled = false;

        // evaluation callback scope
        var scope = {
            async: function () {
                // set method as async
                async = true;
                return function () {
                    // make sure we do not call double
                    // if evaluation is cancelled do not call done event
                    if (canceled === false) {
                        done();
                    }
                };
            },

            fail: function (error) {
                // mask this task as canceled
                canceled = true;
                fail(error);
            }
        };

        // apply params to evaluation callback
        process.worker.apply(scope, process.params);

        // if method is not async then call done callback
        if (!async && canceled === false) {
            done();
        }
    };

    /**
     * @param {Pe} pe
     * @param {number} number
     * @returns {{worker: Function, params: Array}[]}
     */
    var createJobsCollection = function (pe, number) {
        var collection = [];

        // check all stack items that are not processed with this worker
        pe.$stack.forEach(function (stack) {
            // get worker process position
            var position = typeof stack.position === 'undefined' ? -1 : stack.position;
            // check if this stack is processed
            if (position < number) {
                // set that this worker is in queue
                stack.position = number;
                // push to collection worker container and worker params
                collection.push({
                    worker: pe.$workers[number],
                    params: stack.params
                });
            }
        });

        return collection;
    };

    /**
     * @param {Pe} pe
     */
    var createJobsCollectionAll = function (pe) {
        // create jobs collection for every worker
        pe.$workers.forEach(function (worker, index) {
            mergeProcessingQueue(pe, createJobsCollection(pe, index));
        });
    };

    /**
     * @param {Pe} pe
     * @param {Function} done
     */
    var triggerNextWorker = function (pe, done) {
        // lock worker
        unlockStack(pe);
        // go to next worker
        teaseWorker(pe, done);
    };

    /**
     * @param {Pe} pe
     * @param {*} error
     */
    var triggerFailsListeners = function (pe, error) {
        pe.$fails.forEach(function (fail) {
            fail(error);
        });
    };

    /**
     * @param {Pe} pe
     * @param {Function} callback
     */
    var queueWorkerCallback = function (pe, callback) {
        if (typeof callback === 'function') {
            pe.$callbacks.push(callback);
        }
    };

    /**
     * @param {Pe} pe
     */
    var triggerWorkerCallbacks = function (pe) {
        var callback;
        while (callback = pe.$callbacks.shift()) {
            callback();
        }
    };

    /**
     * @param {Pe} pe
     * @param {Function} [done]
     * @scope {Pe}
     */
    var teaseWorker = function (pe, done) {
        // check if worker is not locked
        // locked means that it is currently awake and working
        if (pe.isLocked()) {
            // save callback for later trigger
            queueWorkerCallback(pe, done);
            return;
        }

        // check if queue is not empty
        if (pe.$processing.length > 0) {
            lockStack(pe);
            var shifted = pe.$processing.shift();
            try {
                /**
                 * on worker success
                 */
                var onSuccess = function () {
                    triggerNextWorker(pe, done);
                };

                /**
                 * on worker fail
                 * @param error
                 */
                var onFail = function (error) {
                    triggerFailsListeners(pe, error);
                    triggerNextWorker(pe, done);
                };

                // trigger evaluation
                triggerWorkerProcess(shifted, onSuccess, onFail);
            } catch (e) {
                triggerFailsListeners(pe, e);
                triggerNextWorker(pe, done);
            }
        } else {
            unlockStack(pe);
            if (typeof done === 'function') {
                done();
            }

            triggerWorkerCallbacks(pe);
        }
    };

    /**
     * @param {Pe} pe
     */
    var lockStack = function (pe) {
        pe.$locked = true;
    };

    /**
     * @param {Pe} pe
     */
    var unlockStack = function (pe) {
        pe.$locked = false;
    };

    /**
     * @param {Pe} pe
     */
    var closeStack = function (pe) {
        pe.$closed = true;
    };

    /**
     * @param {Pe} pe
     * @throw {StackClosedError}
     */
    var checkStackAvailability = function (pe) {
        if (pe.$closed) {
            throw new StackClosedError();
        }
    };

    /**
     * @param {Pe} pe
     * @param {Array} params
     */
    var queueStackParams = function (pe, params) {
        pe.$stack.push({params: params});
    };

    /**
     * @param {Pe} pe
     * @param {Function} worker
     * @returns {number} - stack worker index
     */
    var queueStackWorker = function (pe, worker) {
        pe.$workers.push(worker);
        return pe.$workers.length - 1;
    };

    /**
     * @param {Pe} pe
     * @param {Array} collection
     */
    var mergeProcessingQueue = function (pe, collection) {
        collection.forEach(function (process) {
            pe.$processing.push(process);
        });
    };

    /**
     * @param {Pe} pe
     */
    var createEventsListeners = function (pe) {
        return {
            /**
             * @param {Function} callback
             * @returns {Pe}
             */
            fail: function (callback) {
                validateCallback(callback);
                // check if callback is not already in list
                if (pe.$fails.indexOf(callback) === -1) {
                    pe.$fails.push(callback);
                }

                return pe;
            }
        };
    };

    /**
     * Promise Evaluation
     * @name Pe
     * @property {boolean} $closed
     * @property {boolean} $locked
     * @property {Array} $stack
     * @property {Array} $workers
     * @property {Function[]} $fails
     * @property {Array.<{worker: Function, params: Array}>} $processing
     * @property {Function[]} $callbacks
     * @property {{fail: Function}} on
     * @throws {ReferenceError}
     * @constructor
     */
    function Pe () {
        // ensue that pe is called correctly
        if (this instanceof Pe === false) {
            throw new ReferenceError();
        }

        var $$on = createEventsListeners(this);

        var $stack = [];
        var $workers = [];
        var $processing = [];
        var $callbacks = [];
        var $fails = [];
        var $closed = false;
        var $locked = false;

        Object.defineProperties(this, {
            // stack is a property in which we store params that have to be
            // evaluated with passed evaluations
            $stack: {
                writable: false,
                value: $stack
            },
            // workers are storage for callbacks what does all the work
            // @todo implement workers not only callbacks but web-workers too
            $workers: {
                writable: false,
                value: $workers
            },
            // processing is queue from we workers
            $processing: {
                writable: false,
                value: $processing
            },
            // callbacks is a storage for worker notice callbacks which attack when worker
            // is locked and triggers after worker is unlocked
            $callbacks: {
                writable: false,
                value: $callbacks
            },
            // fails callback list
            $fails: {
                writable: false,
                value: $fails
            },
            // closed defined stack status
            // if stack is closed this means its done its jobs and will not do anything else
            $closed: {
                enumerable: true,
                get: function () {
                    return $closed;
                },
                set: function (value) {
                    // check if value type is valid
                    if (typeof value !== 'boolean') {
                        throw new TypeError();
                    }
                    // check if stack is not closed
                    // if stack is closed, if so do not allow to change stack status
                    if ($closed === false) {
                        $closed = value;
                    }
                }
            },
            // stack gets locked when stack is currently preforming jobs
            // when stack is not doing any jobs it get unlocked
            $locked: {
                enumerable: true,
                get: function () {
                    return $locked;
                },
                set: function (value) {
                    // check if value type is valid
                    if (typeof value !== 'boolean') {
                        throw new TypeError();
                    }
                    // set locked value
                    $locked = value;
                }
            },
            // on is for custom events like on worker fail
            on: {
                enumerable: true,
                get: function () {
                    return $$on;
                }
            }
        });
    }

    /**
     * @param {...*}
     */
    Pe.stackFromArray = function () {
        var stack = new Pe();
        [].forEach.call(arguments, function (item) {
            stack.push(item);
        });

        return stack;
    };

    Pe.prototype = {
        /**
         * Push params to stack for later evaluation
         *
         * @param {...*} data
         * @returns {Pe}
         * @throw {StackClosedError}
         */
        push: function (data) {
            checkStackAvailability(this);

            // collect all params from arguments
            data = Array.prototype.slice.call(arguments);
            // queue params to stack
            queueStackParams(this, data);
            // create jobs collection for all worker
            createJobsCollectionAll(this);
            // tease worker to start preforming actions
            teaseWorker(this);

            return this;
        },

        /**
         * Evaluate method runs items that are in clue in sync
         * Evaluate callback is worker function
         *
         * @param {Function} fn - evaluation function
         * @returns {Pe}
         * @throw {StackClosedError}
         * @throw {TypeError}
         */
        evaluate: function (fn) {
            validateCallback(fn);
            checkStackAvailability(this);

            // push evaluator to stack with mode sync
            var index = queueStackWorker(this, fn);
            // push to worker queue
            mergeProcessingQueue(this, createJobsCollection(this, index));
            // tease worker to start preforming actions
            teaseWorker(this);

            return this;
        },

        /**
         * Listener for fails
         * When evaluation fails this method callback fn will be called
         *
         * @deprecated
         * @param {Function} fn
         * @returns {Pe}
         */
        'catch': function (fn) {
            validateCallback(fn);
            // reference to ne new way for fail listening
            this.on.fail(fn);

            return this;
        },

        /**
         * Finish will be called after all items in stack will finish there jobs
         * After finish method call you will not be able to push any items to stack
         * If you will try to push any you will get Error telling that the stack is closed
         *
         * @param {Function} fn
         * @return {Pe}
         */
        finish: function (fn) {
            validateCallback(fn);
            // close stack
            closeStack(this);
            // listen for worker done event
            teaseWorker(this, fn);
        },

        /**
         * Returns is worker locked
         * It means that is is currently working
         *
         * @returns {boolean}
         */
        isLocked: function () {
            return this.$locked;
        },

        /**
         * Returns is worker closed
         * No more actions can be made
         *
         * @returns {boolean}
         */
        isClosed: function () {
            return this.$closed;
        }
    };

    var previous = root.Pe;
    // assign Pe to root
    root.Pe = Pe;

    /**
     * @returns {Pe}
     */
    root.Pe.noConflict = function () {
        root.Pe = previous;
        return Pe;
    };
})();