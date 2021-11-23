import {Auction} from "./models/auction.js";
import express from "express";
import http from 'http';
import { Server } from "socket.io";
import { app } from "./index.js";

const server = http.createServer(app)
const io = new Server(server, {cors: { origin: '*' }});

io.on('connection', socket => {
    console.log(`Client connected ${socket.id}`);
    socket.on('disconnect', s => {
        console.log(`Client ${socket.id} disconnected`)
    })
})

server.listen(8888)

let lastVotedParticipation = undefined;
let lastPaint = undefined;

const auction = new Auction();
export const indexRouter = express.Router();

console.log(auction.params)
let paintings = {};
let auctionTimeOut = new Date((parseInt(auction.params.timeout))).getTime() - new Date().getTime(); // need to ref
console.log(`Auction timeout eq to ${auctionTimeOut}`);

/** GET
 *  Страница для логина
 *  */
indexRouter.get('/', (req,res,next) => {
    res.render('index', {participants: auction.participants})
})

indexRouter.get('/get_participant', (req, res) => {
    console.log(req.query)
    const result = auction.getParticipant(req.query.pID);
    console.log(result)
    return res.json(result);
})

indexRouter.get('/get_participant_paintings', (req, res, next) => {
    const participant = auction.getParticipant(req.query.pID);
    if('boughtPaintings' in participant) {
        return res.json(participant['boughtPaintings']);
    }
    return res.json([]);
})

indexRouter.get('/admin', (req, res, next) => {
    return res.render('admin', {participants: auction.participants, paintings: auction.paintings})
});

const delay = (amount) => {
    return new Promise((resolve) => {
        setTimeout(resolve, amount);
    });
};


async function auctionProgress () {
    for ( let key in auction.paintings ) {
        if ( auction.paintings[key].participation ) {

            lastPaint = Object.assign({}, auction.paintings[key]);
            lastPaint['currentPrice'] = auction.paintings[key].startPrice;
            lastPaint['notVotedYet'] = true;
            lastPaint['id'] = key;

            const timeOuts = auction.params.timeout.split(':');
            const minutes = parseInt(timeOuts[0]);
            const seconds = parseInt(timeOuts[1]);
            const timeOutMillis = minutes * 60000 + seconds * 1000;
            const endTimeOut = (new Date()).getTime() + timeOutMillis;
            io.emit("pictureAuctionStarted", JSON.stringify({
                message: {
                    text: `Открыт аукцион по картине ${auction.paintings[key].title}`,
                    datetime: (new Date()).toLocaleTimeString()
                },
                payload: {
                    painting: auction.paintings[key],
                    timeout: endTimeOut
                }
            }));

            await delay(timeOutMillis);

            if (lastVotedParticipation !== undefined) {
                const pID = lastVotedParticipation.participant.id
                auction.participants[pID].cashReserve = parseInt(auction.participants[pID].cashReserve);

                if('boughtPictures' in auction.participants[pID]) {
                    auction.participants[pID]['boughtPictures'].push(lastPaint);
                } else {
                    auction.participants[pID]['boughtPictures'] = [lastPaint];
                }

                lastVotedParticipation.socket.emit('changeCashReserve', JSON.stringify({
                    massage: {
                        text: `Была куплена картина, теперь ваш баланс равен ${auction.participants[pID].cashReserve}`,
                        datetime: (new Date()).toLocaleTimeString()
                    },
                    payload: {
                        cashReserve: auction.participants[pID].cashReserve,
                        pID: lastVotedParticipation.participant.id
                    }
                }));

                io.emit('changeParticipantCash', JSON.stringify({
                    payload: {
                        cashReserve: auction.participants[pID].cashReserve,
                        pID: lastVotedParticipation.id
                    }
                }))

                io.emit('pictureAuctionFinished', JSON.stringify({
                    message: {
                        text: `Окончен аукцион по холсту ${auction.paintings[key]}, победил участник ${lastVotedParticipation.participant.name}`,
                        datetime: (new Date()).toLocaleTimeString()
                    },
                    payload: {
                        sold: true,
                        participant: lastVotedParticipation.participant,
                        price: lastPaint.currentPrice,
                        painting: lastPaint
                    }
                }));
            } else {
                io.emit("pictureAuctionFinished", JSON.stringify({
                    message: {
                        text: `Окончен аукцион по холсту ${auction.paintings[key].title}, в итоге картина не продана`,
                        datetime: (new Date()).toLocaleTimeString()
                    },
                    payload: {
                        sold: false
                    }
                }));
            }
            lastVotedParticipation = undefined;
        }
    }
    auctionTimeOut = false;
    io.emit("auctionFinished", JSON.stringify({
        message: {
            text: `Аукцион окончен!`,
            datetime: (new Date()).toLocaleTimeString()
        }
    }));
}


setTimeout(() => {
    let start_time = new Date();
    io.emit("auctionStarted", JSON.stringify({
        message: {
            text: `Аукцион начался!`,
            datetime: start_time.toLocaleTimeString()
        },
        payload: {
            startTime: start_time
        }
    }));
    auctionTimeOut = true;
    auctionProgress();

}, 18000);





io.sockets.on('connection', socket => {
    socket.on("apply", (msg) => {
        const pID = JSON.parse(msg).payload['pID'];
        const participant = auction.participants[pID];
        socket.emit("applyCompleted", JSON.stringify({
            message: {
                text: `Участник ${participant.name} подал заявку.`,
                datetime: (new Date()).toLocaleTimeString()
            }
        }));
    });

    socket.on("voteNewPrice", (msg) => {
        const response = JSON.parse(msg);
        const newPrice = parseInt(lastPaint.currentPrice) + response.payload.newPrice;
        const participant = auction.participants[response.payload.pID];
        let participant_can_vote = false;

        const delta = newPrice - parseInt(lastPaint.currentPrice);

        if ((delta === 0) && (lastPaint.notVotedYet) && (newPrice <= parseInt(participant.cashReserve))) {
            participant_can_vote = true;
            lastPaint.notVotedYet = false;
        }

        if (!participant_can_vote) {
            if ((delta > 0) && (delta >= parseInt(lastPaint.minStep)) &&
                (delta <= parseInt(lastPaint.maxStep)) &&
                (newPrice <= parseInt(participant.cashReserve))) {
                participant_can_vote = true;
            }
        }

        if(response.payload.newPrice < 0) participant_can_vote = false;

        if (participant_can_vote) {
            lastPaint.currentPrice = newPrice;
            io.emit("message", JSON.stringify({
                message: {
                    text: `Участник ${participant.name} предложил новую цену ${newPrice}`,
                    datetime: (new Date()).toLocaleTimeString()
                }
            }));
            io.emit("changePrice", JSON.stringify({
                payload: {
                    newPrice: newPrice,
                    painting: lastPaint['id']
                }
            }));
            lastVotedParticipation = {
                socket: socket,
                participant: participant,
                pID: response.payload.pID
            };

        } else {
            socket.emit("auctionStarted", JSON.stringify({
                message: {
                    text: `Невозможно поднять цену! Укажите правильную цену и не жульничайте!`,
                    datetime: (new Date()).toLocaleTimeString()
                }
            }));
        }

    });
});