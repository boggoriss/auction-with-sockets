export class UpdatePaintDTO {
    constructor(data = null) {
        this.id = data?.id;
        this.title = data?.title;
        this.author = data?.author;
        this.description = data?.description;
        this.startPrice = data?.startPrice;
        this.minStep = data?.minStep;
        this.maxStep = data?.maxStep;
        this.imgURL = data?.imgURL;
        this.participation = data?.participation;
    }
}