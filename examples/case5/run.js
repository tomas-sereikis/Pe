var fs = require('fs');
var Pe = require('../../dist/pe.js');

var collection = [];
var stack = new Pe()
    .push('./read/test1.txt')
    .push('./read/test2.txt')
    .push('./read/test3.txt')
    .evaluate(function (filename) {
        var done = this.async();
        fs.readFile(filename, function (err, data) {
            if (err) return;

            collection.push(data.toString());
            done();
        });
    })
    .finish(function () {
        console.log(collection.join("\n"));
    });