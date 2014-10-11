(function () {
    var root = this;

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
            done();
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
    }

    Pe.prototype = {
        /**
         * Push params to stack
         * @param {...*} data
         * @returns {Pe}
         */
        push: function (data) {
            // collect all params
            data = Array.prototype.slice.call(arguments);
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
         * @param {Function} fn - evaluation function
         * @returns {Pe}
         */
        evaluate: function (fn) {
            validateCallback(fn);

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
         * Returns if Pe worker is locked
         * It means that is is currently working
         * @returns {boolean}
         */
        isLocked: function () {
            return this.locked;
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