const DEF_IMG = ''
export class Painting {
    constructor(id, title, author, description, startPrice, minStep, maxStep, imgURL=DEF_IMG) {
        this.id = id;
        this.title = title;
        this.author = author;
        this.description = description;
        this.startPrice = startPrice;
        this.minStep = minStep;
        this.maxStep = maxStep;
        this.imgURL = imgURL;
        this.participation = false;
    }
    participationInAuction (boolVar) {
        this.participation = boolVar;
    }
}


