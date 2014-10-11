describe('Pe', function () {
    var $global = window;

    it('should check if pe is visible', function () {
        expect($global.Pe).toBeTruthy();
    });

    it('should throw error then calling Pe without new', function () {
        expect($global.Pe).toThrow();
    });

    it('should throw error then evaluating with not a function', function () {
        var stack = new Pe();
        expect(function () { stack.evaluate(); }).toThrow();
        expect(function () { stack.evaluate(NaN); }).toThrow();
        expect(function () { stack.evaluate(null); }).toThrow();
        expect(function () { stack.evaluate(1); }).toThrow();
        expect(function () { stack.evaluate('a'); }).toThrow();
        expect(function () { stack.evaluate({}); }).toThrow();
        expect(function () { stack.evaluate([]); }).toThrow();
    });

    it('should evaluate content synced', function () {
        var stack = new Pe();
        var results = 0;

        stack
            .push(1)
            .push(2)
            .push(3);

        expect(function () {
            stack.evaluate(function (num) {
                results += num;
            });
        }).not.toThrow();

        expect(results).toBe(6);
    });

    it('should evaluate content synced with multiple params', function () {
        var stack = new Pe();
        var results = 0;

        stack
            // 2x1
            .push(2, 1)
            // 2x2
            .push(2, 2)
            // 2x3
            .push(2, 3);

        stack.evaluate(function (num, multiplier) {
            results += num * multiplier;
        });

        expect(results).toBe(12);
    });

    it('should evaluate params later, first define then set', function () {
        var stack = new Pe();
        var words = [];

        stack.evaluate(function (word) {
            words.push(word);
        });

        stack.push('Hello');
        expect(words).toEqual(['Hello']);

        stack.push('Test');
        expect(words).toEqual(['Hello', 'Test']);
    });

    it('should evaluate params later, first set then define then set again', function () {
        var stack = new Pe();
        var words = [];

        stack.push('Hello');
        expect(words).toEqual([]);

        stack.evaluate(function (word) {
            words.push(word);
        });
        expect(words).toEqual(['Hello']);

        stack.push('Test');
        expect(words).toEqual(['Hello', 'Test']);
    });

    it('should evaluate params with two different evaluators and the beginning', function () {
        var stack = new Pe();
        var results = 0;

        stack
            .evaluate(function (num) {
                results += num;
            })
            .push(2)
            .evaluate(function (num) {
                results += num * 2;
            })
            .push(4)
            .push(6);

        expect(results).toBe(36);
    });

    it('should evaluate all async', function (done) {
        var stack = new Pe();
        var response = [];
        var check = function () {
            if (response.length === 4) {
                expect(response).toEqual([1, 2, 3, 4]);
                done();
            }
        };

        stack
            .push(1)
            .evaluate(function (num) {
                var done = this.async();
                setTimeout(function () {
                    response.push(num);
                    done();
                    check();
                }, 50 - num * 10);
            })
            .push(2)
            .push(3)
            .push(4);
    });

    it('should evaluate two async and two sync', function (done) {
        var stack = new Pe();
        var response = [];

        var check = function () {
            if (response.length === 4) {
                expect(response).toEqual([1, 'a', 2, 'b']);
                done();
            }
        };

        stack
            .push(1)
            .push('a')
            .evaluate(function (mixed) {
                if (mixed instanceof String) {
                    var done = this.async();
                    setTimeout(function () {
                        response.push(mixed);
                        done();
                        check();
                    }, 10);
                } else {
                    response.push(mixed);
                    check();
                }
            })
            .push(2)
            .push('b');
    });

    it('should test lock', function (done) {
        var stack = new Pe();
        var response = [];

        var check = function () {
            if (response.length === 4) {
                expect(response).toEqual([1, 2, 3, 4]);
                expect(stack.isLocked()).toBeFalsy();
                done();
            }
        };

        stack
            .push(1)
            .push(2)
            .evaluate(function (num) {
                var done = this.async();
                setTimeout(function () {
                    response.push(num);
                    done();
                    check();
                }, 10);
            })
            .push(3)
            .push(4);

        expect(stack.isLocked()).toBeTruthy();
    });

    it('should check if noConflict Pe is working', function () {
        var $Pe = Pe.noConflict();
        var stack = new $Pe();
        var results = 0;

        stack
            .push(1)
            .evaluate(function (num) {
                results = num;
            });

        expect(results).toBe(1);
    });
});