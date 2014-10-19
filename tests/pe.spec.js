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

    it('should check if $stack params is writable', function () {
        var stack = new Pe();
        stack.$stack = 1;
        expect(stack.$stack).not.toBe(1);
    });

    it('should check if $workers params is writable', function () {
        var stack = new Pe();
        stack.$workers = 1;
        expect(stack.$workers).not.toBe(1);
    });

    it('should check if $processing params is writable', function () {
        var stack = new Pe();
        stack.$processing = 1;
        expect(stack.$processing).not.toBe(1);
    });

    it('should check if $callbacks params is writable', function () {
        var stack = new Pe();
        stack.$callbacks = 1;
        expect(stack.$callbacks).not.toBe(1);
    });

    it('should check if $closed can set not boolean variable', function () {
        var stack = new Pe();
        expect(function () { stack.$closed = 1; }).toThrow();
    });

    it('should check if $closed variable can be set to false after setting true', function () {
        var stack = new Pe();
        stack.$closed = true;
        expect(stack.$closed).toBe(true);
        expect(stack.isClosed()).toBe(true);
        stack.$closed = false;
        expect(stack.$closed).toBe(true);
        expect(stack.isClosed()).toBe(true);
    });

    it('should check if $locked can set not boolean variable', function () {
        var stack = new Pe();
        expect(function () { stack.$locked = 1; }).toThrow();
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

    it('should lock stack after sync finish method', function () {
        var stack = new Pe();
        var response = [];
        var called = false;

        stack
            .push(1)
            .push(2)
            .evaluate(function (num) {
                response.push(num);
            })
            .push(3)
            .push(4)
            .finish(function () {
                called = true;
            });

        expect(response).toEqual([1, 2, 3, 4]);
        expect(called).toBeTruthy();

        expect(function () {
            stack.push(5);
        }).toThrow();

        expect(function () {
            stack.evaluate(function () {
                // ...
            });
        }).toThrow();

        expect(stack.isClosed()).toBeTruthy();
    });

    it('should lock stack after async finish method', function (done) {
        var stack = new Pe();
        var response = [];

        stack
            .push(1)
            .push(2)
            .evaluate(function (num) {
                var done = this.async();
                setTimeout(function () {
                    response.push(num);
                    done();
                }, 10);
            })
            .push(3)
            .push(4)
            .finish(function () {
                expect(response).toEqual([1, 2, 3, 4]);
                done();
            });

        expect(stack.isClosed()).toBeTruthy();

        expect(function () {
            stack.push(5);
        }).toThrow();

        expect(function () {
            stack.evaluate(function () {
                // ...
            });
        }).toThrow();
    });

    it('should use fast stack method', function () {
        var response = [];
        Pe.stackFromArray(1, [2], [3, 4])
            .evaluate(function () {
                response.push([].slice.call(arguments));
            });

        expect(response).toEqual([[1], [[2]], [[3, 4]]]);
    });

    it('should fail from one item of list', function () {
        var response = [];
        var fails = [];

        Pe.stackFromArray(1, 2, 3, 4)
            .on.fail(function (e) {
                fails.push(e);
            })
            .evaluate(function (num) {
                if (num !== 2) {
                    response.push(num);
                } else {
                    throw num;
                }
            });

        expect(response).toEqual([1, 3, 4]);
        expect(fails).toEqual([2]);
    });

    it('should check if deprecated is still working', function () {
        var response = [];

        Pe.stackFromArray(1, 2)
            .catch(function (num) {
                response.push(num);
            })
            .evaluate(function (num) {
                if (num === 2) {
                    throw num;
                }
            });

        expect(response).toEqual([2]);
    });

    it('should not create two the same fail listeners', function () {
        var response = [];
        var onFail = function (num) {
            response.push(num);
        };

        Pe.stackFromArray(1, 2)
            .on.fail(onFail)
            .on.fail(onFail)
            .evaluate(function (num) {
                if (num === 2) {
                    throw num;
                }
            });

        expect(response).toEqual([2]);
    });

    it('should fail from async task', function (done) {
        var response = [];
        var fails = [];

        Pe.stackFromArray(1, 2, 3, 4)
            .on.fail(function (e) {
                fails.push(e);
            })
            .evaluate(function (num) {
                var done = this.async();
                var fail = this.fail;

                // async
                setTimeout(function () {
                    if (num !== 2) {
                        response.push(num);
                    } else {
                        fail(num);
                    }

                    done();
                }, 10);
            })
            .finish(function () {
                expect(response).toEqual([1, 3, 4]);
                expect(fails).toEqual([2]);

                done();
            });
    });

    it('should continue to next worker on async task fail', function (done) {
        var response = [];
        var fails = [];

        Pe.stackFromArray(1, 2)
            .on.fail(function (e) {
                fails.push(e);
            })
            .evaluate(function (num) {
                var done = this.async();
                var fail = this.fail;

                // async
                setTimeout(function () {
                    if (num !== 1) {
                        response.push(num);
                        // call only on success
                        done();
                    } else {
                        // do not call done here
                        fail(num);
                    }
                }, 10);
            })
            .finish(function () {
                expect(response).toEqual([2]);
                expect(fails).toEqual([1]);

                done();
            });
    });
});