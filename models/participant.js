const DEF_IMG = ''

export class Participant {
    constructor(id, name, cashReserve, imgURL=DEF_IMG) {
        this.id = id;
        this.name = name;
        this.cashReserve = cashReserve;
        this.imgURL = imgURL;
    }
}