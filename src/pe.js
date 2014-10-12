(function () {
    var root = this;

    /**
     * @name StackClosedError
     * @constructor
     */
    function StackClosedError() { }
    StackClosedError.prototype = new Error();

    /**
     * Checks if passed param is Function type
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
     * Checks if stack if closed
     * @scope {Pe}
     * @throw {StackClosedError}
     */
    var validateStackClosed = function () {
        if (this.closed) {
            throw new StackClosedError();
        }
    };

    /**
     * @param {Function} fn
     * @param {Array} params
     * @param {Function} done
     */
    var triggerEvaluationCallback = function (fn, params, done) {
        // set default async off
        var async = false;
        // evaluation callback scope
        var scope = {
            async: function () {
                // set method as async
                async = true;
                return done;
            }
        };

        // apply params to evaluation callback
        fn.apply(scope, params);

        // if method is not async then call done callback
        if (!async) {
            done();
        }
    };

    /**
     * @param {number} index
     * @scope {Pe}
     * @returns {{evaluation: *, params: *}[]}
     */
    var makeEvaluationCollection = function (index) {
        var collection = [];
        for (var i = 0; i < this.stack.length; i++) {
            var stack = this.stack[i];
            // get progress index of current stack
            var process = typeof stack.process === 'undefined' ? -1 : stack.process;
            // check if evaluation was made for this stack
            if (process < index) {
                collection.push({evaluation: this.evaluations[index], params: this.stack[i].params});
                stack.process = index;
            }
        }

        return collection;
    };

    /**
     * @param {Function} [done]
     * @scope {Pe}
     */
    var teaseWorker = function (done) {
        // check if worker is not locked
        // locked means that it is currently awake and working
        if (this.isLocked()) {
            // save callback for later trigger
            this.triggers.push(done);
            return;
        }

        // check if queue is not empty
        if (this.queue.length > 0) {
            // lock worker
            this.locked = true;
            // get first collection
            var collection = this.queue[0];

            // check if collection is not empty
            if (collection.length > 0) {
                var shifted = collection.shift();
                // we need to save reference so self
                var that = this;

                // trigger evaluation
                triggerEvaluationCallback(
                    // evaluation callback
                    shifted.evaluation,
                    // evaluation callback params
                    shifted.params,
                    // on evaluation done callback
                    function () {
                        // unlock worker
                        that.locked = false;
                        // process to next queue item
                        teaseWorker.call(that, done);
                    }
                );
            } else {
                this.queue.shift();
                // unlock worker
                this.locked = false;
                teaseWorker.call(this, done);
            }
        } else {
            // unlock worker
            this.locked = false;
            // trigger done callback
            done();
            // worker list is empty so we can trigger all queued done triggers
            while (this.triggers.length) {
                // shift and trigger
                this.triggers.shift()();
            }
        }
    };

    /**
     * Push to masker array content array only if content array is not empty
     * @param {Array} to - master array
     * @param {Array} collection - content array
     * @returns {boolean} - success status
     */
    var pushNotEmpty = function (to, collection) {
        if (collection.length > 0) {
            to.push(collection);

            return true;
        }

        return false;
    };

    /**
     * Promise Evaluation
     * @name Pe
     * @throws {ReferenceError}
     * @constructor
     */
    function Pe () {
        // ensue that pe is called correctly
        if (this instanceof Pe === false) {
            throw new ReferenceError();
        }

        // collection for evaluator params
        this.stack = [];
        // collection for evaluators
        this.evaluations = [];
        // worker queue
        this.queue = [];
        // worker status
        this.locked = false;
        // triggers list of callbacks
        // when you tease worker when it is locked then your callback saves here
        // when worker is free it triggers all callbacks and cleans this this
        // this way teaseWorker will always trigger done callback
        this.triggers = [];
        // closed stack becomes after adding finish method
        this.closed = false;
    }

    Pe.prototype = {
        /**
         * Push params to stack for later evaluation
         *
         * @param {...*} data
         * @returns {Pe}
         * @throw {StackClosedError}
         */
        push: function (data) {
            validateStackClosed.call(this);

            // collect all params
            data = [].slice.call(arguments);
            this.stack.push({params: data});

            // make evaluations collections from every evaluation
            // and push them to worker queue
            var status = false;
            this.evaluations.forEach(function (value, key) {
                if (pushNotEmpty(this.queue, makeEvaluationCollection.call(this, key))) {
                    status = true;
                }
            }, this);

            // check if we have work for worker
            if (status) {
                // tease worker to start preforming actions
                teaseWorker.call(this, function () {
                    // this callback if empty for future purposes
                });
            }

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
            validateStackClosed.call(this);

            // push evaluator to stack with mode sync
            this.evaluations.push(fn);
            // get current index of inserted evaluation
            var index = this.evaluations.length - 1;

            // push to worker queue
            // and check if we have work for worker
            if (pushNotEmpty(this.queue, makeEvaluationCollection.call(this, index))) {
                // tease worker to start preforming actions
                teaseWorker.call(this, function () {
                    // this callback if empty for future purposes
                });
            }

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
            this.closed = true;
            // listen for worker done event
            teaseWorker.call(this, function () {
                fn();
            });
        },

        /**
         * Returns is worker locked
         * It means that is is currently working
         *
         * @returns {boolean}
         */
        isLocked: function () {
            return this.locked;
        },

        /**
         * Returns is worker closed
         * No more actions can be made
         *
         * @returns {boolean}
         */
        isClosed: function () {
            return this.closed;
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