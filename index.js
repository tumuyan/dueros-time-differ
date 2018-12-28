const Bot = require('bot-sdk');
const privateKey = require("./rsaKeys.js").privateKey;

class DuerOSBot extends Bot {
    constructor(postData) {
        super(postData);

        this.addLaunchHandler(() => {
            this.waitAnswer();
            let card = new Bot.Card.TextCard('欢迎使用“时间差”\n告诉我目标时刻，我会为您计算时间差');
            return {
                card: card,
                outputSpeech: '请告诉我目标时刻，我会为您计算时间差'
            };
        });

        this.addSessionEndedHandler(() => {
            this.endSession();
            return {
                outputSpeech: '感谢您的使用'
            };
        });

        this.addIntentHandler('time_differ', () => {
            this.waitAnswer();

            let time1 = this.getSlot('sys.time');
            let time2 = this.getSlot('sys.date-time');
            let time3 = this.getSlot('sys.date');
            let differ_type = this.getSlot('differ_type');
            let s_log = '';

            if ((!time2) && (!time1) && (!time3)) {
                //  this.nlu.ask('sys.date-time');
                let card = new Bot.Card.TextCard('我没有听清楚时间,请重说一遍');
                return Promise.resolve({
                    card: card,
                    outputSpeech: '请重复下时间'
                });
            }

            // 输入的时间（ms）
            let t1 = 0;

            if (time2) {
                t1 = new Date(time2).getTime();
            } else if (time1) {
                let myDate = new Date();
                let mData = myDate.getFullYear() + '/' + (myDate.getMonth() + 1) + '/' + myDate.getDate() + ' '
                t1 = new Date(mData + time1).getTime();
            } else if (time3) {
                t1 = new Date(time3).getTime();
                s_log = new Date(time3) + t1 + '\n';
                // let x=''+time3+' 00:00:01';
                // x=x.replace(/-/g,'/');
                // t1 = new  Date(x).getTime();
                // s_log=x+'\n'+ Date(x)+'\n'+t1+'\n';
            }
            //javascript:alert("2018-12-9".replace(/-/g,'/'));

            // 服务器时区
            var zo = (new Date()).getTimezoneOffset();
            // 现在看，c/s均使用UTC，但是client 把时区忽略了时区把东八区当作了0区。
            //所以输入的时间t1 UTC需要减去8个时区，
            t1 = t1 - 8 * 60 * 60000;


            let s_h = '';
            let s_m = '';
            let s_d = '';

            // 服务器时间（ms）
            let t0 = new Date().getTime();


            // 获取时间差的分钟数
            let differ = (t1 - t0) / 60000;
            s_log += differ + '\n';

            let type = '还有';

            if (differ < 0) {
                if (!differ_type) {
                    // 没有输入类型，且输入时间比现在晚
                    type = '已经过去';
                    differ = 0 - differ;
                } else if (differ_type == '-') {
                    // 输入类型一致，且输入时间比现在晚
                    type = '已经过去';
                    differ = 0 - differ;
                } else {
                    // 输入类型不一致，且输入时间比现在晚，需要猜测是不是上下午或者搞错了
                    // 由于只考虑东八区，所以只考虑加一天的情况
                    if (differ < (-12 * 60)) {
                        differ += 24 * 60;
                    } else if (differ >= (-12 * 60)) {
                        differ += 12 * 60;
                    } else {
                        type = '已经过去';
                        differ = 0 - differ;
                    }


                }


            }

            if (differ / 60 > 24 && time1) {
                // 普通时间不可以超过24h
                differ -= 60 * 24;
            }


            // 生成输入的时间（文本）和现在时间（文本）
            let s_t1 = '' + new Date(t1);
            let s_t0 = '' + new Date();

            // 生成时间差的文本				
            if (differ > 60) {
                let h = parseInt(differ / 60);
                if (h > 120 || this.getSlot('unit') == '天') {
                    s_d = parseInt(h / 24) + '天';
                    s_h = parseInt(differ % 24) + '小时';
                } else {
                    s_h = parseInt(differ / 60) + '小时';
                    s_m = parseInt(differ % 60) + '分钟';
                }

            } else {
                s_m = parseInt(differ) + '分钟';
            }

            let card = new Bot.Card.TextCard(type + s_d + s_h + s_m);

            // let card = new Bot.Card.TextCard('现在' + s_t0 + '\n距离' + s_t1 + '\n' + type + s_h + s_m);

            //   展示测试数据	
            //    let card = new Bot.Card.TextCard(s_log+'现在'+s_t0+'\n距离'+s_t1+ +'\n' +type+s_d+s_h+s_m +'\ninput: (sys.time)'+ time1+'☆(sys.date-time)'+ time2+'\nsys.data '+time3);
            // 可以返回异步 Promise
            return Promise.resolve({
                card: card,
                outputSpeech: type + s_d + s_h + s_m
            });


        });

        //ai.dueros.common.default_intent

        this.addIntentHandler('ai.dueros.common.default_intent', () => {
            this.waitAnswer();

            let card = new Bot.Card.TextCard('你可以问我：离哪天还有几天，或者离几点钟过去多长时间。\n比如：“离明年春节还有几天”，又比如：“昨天中午十二点到现在过了多长时间”');

            return Promise.resolve({
                card: card,
                outputSpeech: '你可以问我：离哪天还有几天，或者离几点钟过去多长时间。比如：“离明年春节还有几天”，又比如：“昨天中午十二点到现在过了多长时间”'
            });


        });

    }
}

exports.handler = function (event, context, callback) {
    try {
        let b = new DuerOSBot(event);
        // 0: debug  1: online
        b.botMonitor.setEnvironmentInfo(privateKey, 0);
        b.run().then(function (result) {
            callback(null, result);
        }).catch(callback);
    } catch (e) {
        callback(e);
    }
}
