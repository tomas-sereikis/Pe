/* BUILD REMOVE */(function () {
    if (typeof module !== 'undefined' && module.exports) {
        // Node.js
        module.exports = Pe;
    } else if (typeof define !== 'undefined' && define.amd) {
        // AMD / RequireJS
        define([], function () {
            return Pe;
        });
    } else {
        var root = this;
        // Browser
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
    }
/* BUILD REMOVE */})();