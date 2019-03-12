# jad-tracer文档

#### 安装

```javascript
npm install jad-tracer --save
```

#### 初始化

```javascript
import { InitTracer } from 'jad-tracer';

InitTracer({
    serviceName: `serviceName`,
    serverUrl: 'serverUrl'
});
```

#### 监听DOM

暂时不支持表单内容监听

```javascript
import { InitDom } from 'jad-tracer';

InitDom();
```

```html
<button data-apmclick="btn">监听click事件</button>
<a data-apmhover="link" href="http://dsdsd">监听hover事件</a>
```



#### 设置追踪用户

```javascript
import { InitUser } from 'jad-tracer';

InitUser({
    username: username,
    id: id,
    email: email
});
```

#### 捕捉全局错误

暂时只有Angular版本的Demo

- error-handle.service.ts

  ```javascript
  import { ErrorHandler, Injectable } from '@angular/core';
  import { AddError } 'jad-tracer';
  
  @Injectable()
  export class GlobalErrorHandler implements ErrorHandler {
      constructor() {}
      handleError(error) {
          AddError(error);
          throw error;
      }
  }
  ```

  

- app.module.ts

  ```javascript
  import { NgModule, ErrorHandler } from '@angular/core';
  
  @NgModule({
      declarations: [],
      imports: [
      ],
      providers: [
          {
              provide: ErrorHandler,
              useClass: GlobalErrorHandler
          }
      ],
      bootstrap: []
  })
  export class AppModule {}
  ```

#### 监听页面跳转

由于APM自身限制，除捕捉错误不会中断页面跳转事件，其它任何自定义上报事件都会中断页面自动捕捉行为，导致页面停留时长不准确

页面跳转会自动捕捉Http请求，如果被中断，则不会记录后续请求

暂时只有Angular版本的Demo

```javascript
import { StartPageJump, EndPageJump } 'jad-tracer';
import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
    selector: 'app',
    styleUrls: [ '' ],
    templateUrl: ''
})
export class DemoComponent implements OnInit {
    constructor(
        public router: Router
    ) {}
    ngOnInit() {
        
        let StartPage = StartPageJump('url');
        this.router.events.pipe(filter((val) => val instanceof NavigationEnd)).subscribe((val: any) => {
            if (StartPage) {
                EndPageJump(val.urlAfterRedirects, StartPage);
            }
            StartPage = StartPageJump('url');
        });
    }
}
```

#### 监听Http响应

建议不要在http-handle.service.ts中全局使用，对有需要的服务单独进行监听

```javascript
import { StartHttp, EndHttp } from 'jad-tracer';

const HttpTransaction = StartHttp('get', 'url', data ? data : null);

// 异步结果
EndHttp(body, HttpTransaction);

```

