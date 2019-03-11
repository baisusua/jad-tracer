"use strict";
exports.__esModule = true;
var elastic_apm_js_base_1 = require("elastic-apm-js-base");
var apm;
function InitTracer(config) {
    apm = elastic_apm_js_base_1.init(config);
    AddFilter();
}
exports.InitTracer = InitTracer;
function IsInit() {
    if (!apm) {
        throw new Error('Monitoring not set. Please set the monitoring using configure method');
    }
    return true;
}
exports.IsInit = IsInit;
function GetAPM() {
    IsInit();
    return apm;
}
exports.GetAPM = GetAPM;
function AddFilter(filter) {
    IsInit();
    if (!filter) {
        apm.addFilter(function (payload) {
            if (payload.transactions) {
                payload.transactions.forEach(function (item) {
                    if (item.context && item.context.page && item.type === 'page-load') {
                        item.name =
                            new URL(item.context.page.url).hash.split('#/')[1] +
                                ("\uFF08" + format(new Date(), 'yyyy-MM-dd hh:mm:ss') + "\uFF09");
                    }
                    item.spans
                        .filter(function (span) {
                        if (item.type !== 'HttpRes') {
                            return true;
                        }
                        if (span.subType !== 'http') {
                            return true;
                        }
                    })
                        .forEach(function (span) {
                        if (span.subType === 'http' && span.context && span.context.http && span.context.http.url) {
                            span.name = span.context.http.method + " " + span.context.http.url;
                        }
                        if (span.type === 'pending' || span.type === 'finshed') {
                            span.subType = 'http';
                        }
                    });
                });
            }
            return payload;
        });
    }
    else {
        apm.addFilter(filter);
    }
}
exports.AddFilter = AddFilter;
function InitUser(user) {
    IsInit();
    apm.setUserContext(user);
}
exports.InitUser = InitUser;
function InitDom() {
    /* 后面增加表单监听 */
    IsInit();
    var click = function (e) {
        var name = e.target.getAttribute('data-apmclick');
        if (name) {
            var time = format(new Date(), 'yyyy-MM-dd hh:mm:ss');
            var ClickTransaction = CreateTransaction(name + "\uFF08" + time + "\uFF09", 'ClickEvent');
            ClickTransaction.addTags({
                start_date: time
            });
            ClickTransaction.startSpan(name, 'click');
            ClickTransaction.end();
        }
    };
    var hover = function (e) {
        var name = e.target.getAttribute('data-apmhover');
        if (name) {
            var time = format(new Date(), 'yyyy-MM-dd hh:mm:ss');
            var HoverTransaction = CreateTransaction(name + "\uFF08" + time + "\uFF09", 'HoverEvent');
            HoverTransaction.addTags({
                start_date: time
            });
            HoverTransaction.startSpan(name, 'hover');
            HoverTransaction.end();
        }
    };
    document.removeEventListener('click', click, false);
    document.addEventListener('click', click, false);
    document.removeEventListener('mouseover', hover, false);
    document.addEventListener('mouseover', hover, false);
}
exports.InitDom = InitDom;
function CreateTransaction(name, type) {
    /* 生成一个新的transaction */
    IsInit();
    return apm.startTransaction(name, type);
}
exports.CreateTransaction = CreateTransaction;
function AddError(error) {
    IsInit();
    apm.captureError(error);
}
exports.AddError = AddError;
function StartHttp(method, url, data) {
    var time = format(new Date(), 'yyyy-MM-dd hh:mm:ss');
    var HttpTransaction = CreateTransaction(method + " " + url + "\uFF08" + time + "\uFF09", 'HttpRes');
    var params = JSON.stringify(data);
    HttpTransaction.addTags({
        start_date: time,
        params: params
    });
    var span = HttpTransaction.startSpan(params.length > 100 ? "\u8BF7\u5728Tags\u4E2D\u67E5\u770B\u53C2\u6570" : "\u53C2\u6570 " + params, 'pending');
    span.end();
    return HttpTransaction;
}
exports.StartHttp = StartHttp;
function EndHttp(data, HttpTransaction) {
    if (HttpTransaction) {
        var res = JSON.stringify(data);
        HttpTransaction.addTags({
            end_date: format(new Date(), 'yyyy-MM-dd hh:mm:ss'),
            res: res
        });
        HttpTransaction.startSpan('请求结束', 'finshed');
        HttpTransaction.end();
    }
}
exports.EndHttp = EndHttp;
function StartPageJump(url) {
    var time = format(new Date(), 'yyyy-MM-dd hh:mm:ss');
    var PageJumpTransaction = CreateTransaction(url + ("\uFF08" + time + "\uFF09"), 'JumpPage');
    PageJumpTransaction.addTags({
        start_date: time
    });
    PageJumpTransaction.startSpan("\u505C\u7559\u65F6\u957F", 'stay');
    return PageJumpTransaction;
}
exports.StartPageJump = StartPageJump;
function EndPageJump(url, PageJumpTransaction) {
    if (PageJumpTransaction) {
        PageJumpTransaction.addTags({
            end_date: format(new Date(), 'yyyy-MM-dd hh:mm:ss')
        });
        PageJumpTransaction.end();
    }
}
exports.EndPageJump = EndPageJump;
function format(date, fmt) {
    var o = {
        'M+': date.getMonth() + 1,
        'd+': date.getDate(),
        'h+': date.getHours(),
        'm+': date.getMinutes(),
        's+': date.getSeconds(),
        'q+': Math.floor((date.getMonth() + 3) / 3),
        S: date.getMilliseconds()
    };
    if (/(y+)/.test(fmt)) {
        fmt = fmt.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length));
    }
    for (var k in o) {
        if (new RegExp('(' + k + ')').test(fmt)) {
            fmt = fmt.replace(RegExp.$1, RegExp.$1.length === 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length));
        }
    }
    return fmt;
}
exports.format = format;
