import {Painting} from "./painting.js";
import {Participant} from "./participant.js";
import * as fs from 'fs'
import moment from 'moment'
import {v4 as uuid} from 'uuid'

const DB_FILE = '/home/toa/WebstormProject/auction-with-sockets/db.json'

export class Auction {
    constructor () {
        let inst = {};
        try {
            inst = JSON.parse(fs.readFileSync(DB_FILE));
            this.participants = inst['participants'];
            this.paintings = inst['paintings'];
            this.params = inst['params']

        } catch (err) {
            console.log('Error while reading file!')
        }
    }
    /** Логика работы с картиной
     *
     */
    addPainting (title, author, description, startPrice, minStep, maxStep, imgURL) {
        let id = uuid();
        this.paintings[id] = new Painting(id, title, author, description, startPrice, minStep, maxStep, imgURL);
        this.save();
    }

    getPaintingByID (id) {
        return this.paintings[id];
    }

    editPaint (dto) {
        let painting = this.getPaintingByID(dto.id);
        this.paintings[dto.id] = this.edit(dto, painting);
        console.log(dto, this.paintings[dto.id])
        this.save();
    }

    removePainting (id) {
        if(id in this.paintings) {
            delete this.paintings[id];
            this.save();
        }
    }
    /** Логика работы с участниками.
     *
     */
    addParticipant (name, cashReserve, imgURL) {
        let id = uuid();
        let newParticipant = undefined;
        if (imgURL === "") {
            newParticipant = new Participant(id, name, cashReserve);
        } else {
            newParticipant = new Participant(id, name, cashReserve, imgURL);
        }
        this.participants[id] = newParticipant;
        this.save();
    }

    getParticipant (id) {
        return this.participants[id];
    }

    editParticipant (dto) {
        let participant = this.participants[dto.id]
        this.participants[dto.id] = this.edit(dto, participant)
    }

    removeParticipant (id) {
        if (id in this.participants) {
            delete this.participants[id];
            this.save();
        }
    }
    /** Логика работы со временем.
     *
     */
    setStartDateTime (dateTime) {
        this.params['dateTime'] = dateTime;
        this.save()
    }

    setSaleTimeout (millis) {
        this.params['timeout'] = millis;
        this.save();
    }

    setCountingTime (millis) {
        this.params['countingTime'] = millis;
    }

    setPause (millis) {
        this.params['pause'] = millis;
        this.save();
    }

    getStartDateTime() {
        return moment(new Date(parseInt(this.params.dateTime))).format('YYYY-MM-DDTHH:mm');
    }

    getParams() {
        return {
            datetime: this.getStartDateTime(),
            timeout: this.params.timeout,
            pause: this.params.pause,
            interval: this.params.countingTime
        }
    }

    save () {
        /** Сохранение базы данных
         * */
        fs.writeFile(DB_FILE, JSON.stringify(this), err => {
            if(err) throw err;
            console.log('DB was saved');
        })
    }

    edit (dto, objToUpdate) {
        /** Редактирование элемента - прининимает DTO и объект, к которому необходимо применить изменения
         * @param { dto } - DTO (см. паттерн Data Transfer Object).
         * @return { upd } - обновленная версия элемента.
         * */
        if (objToUpdate !== undefined) {
            let upd = {};
            Object.keys(dto).forEach(
                key => {
                    if(dto[key] === undefined) {
                        upd[key] = objToUpdate[key];
                    } else {
                        upd[key] = dto[key];
                    }
                });
            return upd;
        }
        return undefined;
    }
}
