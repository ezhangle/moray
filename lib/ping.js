// Copyright 2012 Joyent, Inc.  All rights reserved.

var util = require('util');

var assert = require('assert-plus');
var uuid = require('node-uuid');



///--- Handlers


function ping(options) {
        assert.object(options, 'options');
        assert.object(options.log, 'options.log');
        assert.object(options.manatee, 'options.manatee');

        var manatee = options.manatee;

        function _ping(opts, res) {
                var log = options.log.child({
                        req_id: opts.req_id || uuid.v1()
                });

                log.debug({
                        opts: opts
                }, 'ping: entered');

                if (!opts.deep) {
                        log.debug('ping: done');
                        res.end();
                        return;
                }

                manatee.start(function (startErr, pg) {
                        if (startErr) {
                                log.debug(startErr, 'ping: no DB handle');
                                res.end(startErr);
                                return;
                        }

                        var req = pg.query('SELECT name FROM buckets_config ' +
                                           'LIMIT 1');

                        req.once('error', function (err) {
                                log.debug(err, 'postgres error');
                                req.removeAllListeners('end');
                                req.removeAllListeners('row');
                                res.end(err);
                                pg.rollback(function () {});
                        });

                        req.once('row', function (r) {
                                log.debug(r, 'row received');
                        });

                        req.once('end', function () {
                                log.debug('request done');
                                req.removeAllListeners('error');
                                req.removeAllListeners('row');
                                pg.rollback(function (err) {
                                        res.end(err);
                                });
                        });
                });

        }

        return (_ping);
}



///--- Exports

module.exports = {
        ping: ping
};