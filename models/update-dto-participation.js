export class UpdateDtoParticipation {
    constructor(data = null) {
        this.id = data?.id;
        this.name = data?.name;
        this.cashReserve = data?.cashReserve;
        this.imgURL = data?.imgURL;
    }
}