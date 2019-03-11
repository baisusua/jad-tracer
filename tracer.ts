import { init as initApm, transaction } from 'elastic-apm-js-base';

export interface InitConfig {
    serviceName: string;
    serverUrl: string;
}
export interface UserConfig {
    id: string;
    username: string;
    email: string;
}

let apm: any;

export function InitTracer(config: InitConfig) {
    apm = initApm(config);
    AddFilter();
}

export function IsInit() {
    if (!apm) {
        throw new Error('Monitoring not set. Please set the monitoring using configure method');
    }
    return true;
}

export function GetAPM() {
    IsInit();
    return apm;
}

export function AddFilter(filter?: () => void) {
    IsInit();
    if (!filter) {
        apm.addFilter((payload) => {
            if (payload.transactions) {
                payload.transactions.forEach((item) => {
                    if (item.context && item.context.page && item.type === 'page-load') {
                        item.name =
                            new URL(item.context.page.url).hash.split('#/')[1] +
                            `（${format(new Date(), 'yyyy-MM-dd hh:mm:ss')}）`;
                    }
                    item.spans
                        .filter((span) => {
                            if (item.type !== 'HttpRes') {
                                return true;
                            }
                            if (span.subType !== 'http') {
                                return true;
                            }
                        })
                        .forEach(function(span) {
                            if (span.subType === 'http' && span.context && span.context.http && span.context.http.url) {
                                span.name = `${span.context.http.method} ${span.context.http.url}`;
                            }
                            if (span.type === 'pending' || span.type === 'finshed') {
                                span.subType = 'http';
                            }
                        });
                });
            }
            return payload;
        });
    } else {
        apm.addFilter(filter);
    }
}

export function InitUser(user: UserConfig) {
    IsInit();
    apm.setUserContext(user);
}

export function InitDom() {
    /* 后面增加表单监听 */
    IsInit();

    const click = (e) => {
        const name = e.target.getAttribute('data-apmclick');
        if (name) {
            const time = format(new Date(), 'yyyy-MM-dd hh:mm:ss');
            const ClickTransaction = CreateTransaction(`${name}（${time}）`, 'ClickEvent');
            ClickTransaction.addTags({
                start_date: time
            });
            ClickTransaction.startSpan(name, 'click');
            ClickTransaction.end();
        }
    };
    const hover = (e) => {
        const name = e.target.getAttribute('data-apmhover');
        if (name) {
            const time = format(new Date(), 'yyyy-MM-dd hh:mm:ss');
            const HoverTransaction = CreateTransaction(`${name}（${time}）`, 'HoverEvent');
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

export function CreateTransaction(name: string, type: string): transaction {
    /* 生成一个新的transaction */
    IsInit();
    return apm.startTransaction(name, type);
}

export function AddError(error: Error) {
    IsInit();
    apm.captureError(error);
}

export function StartHttp(method: string, url: string, data: any): transaction {
    const time = format(new Date(), 'yyyy-MM-dd hh:mm:ss');
    const HttpTransaction = CreateTransaction(`${method} ${url}（${time}）`, 'HttpRes');
    const params = JSON.stringify(data);
    HttpTransaction.addTags({
        start_date: time,
        params: params
    });
    const span = HttpTransaction.startSpan(params.length > 100 ? `请在Tags中查看参数` : `参数 ${params}`, 'pending');
    span.end();
    return HttpTransaction;
}

export function EndHttp(data: any, HttpTransaction: transaction): transaction {
    if (HttpTransaction) {
        const res = JSON.stringify(data);
        HttpTransaction.addTags({
            end_date: format(new Date(), 'yyyy-MM-dd hh:mm:ss'),
            res: res
        });
        HttpTransaction.startSpan('请求结束', 'finshed');
        HttpTransaction.end();
    }
}

export function StartPageJump(url: string): transaction {
    const time = format(new Date(), 'yyyy-MM-dd hh:mm:ss');
    const PageJumpTransaction = CreateTransaction(url + `（${time}）`, 'JumpPage');
    PageJumpTransaction.addTags({
        start_date: time
    });
    PageJumpTransaction.startSpan(`停留时长`, 'stay');
    return PageJumpTransaction;
}

export function EndPageJump(url: string, PageJumpTransaction: transaction): transaction {
    if (PageJumpTransaction) {
        PageJumpTransaction.addTags({
            end_date: format(new Date(), 'yyyy-MM-dd hh:mm:ss')
        });
        PageJumpTransaction.end();
    }
}

export function format(date: Date, fmt: string) {
    const o = {
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
    for (const k in o) {
        if (new RegExp('(' + k + ')').test(fmt)) {
            fmt = fmt.replace(RegExp.$1, RegExp.$1.length === 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length));
        }
    }
    return fmt;
}
