let curP = undefined;
let socket = undefined;
let pictureTimeOut = undefined;
let fullTimeOut = undefined;
let prev = 0;

const startAuctionTimer = (start_time) => {
    upTime(start_time);
};

const stopAuctionTimer = () => {
    clearTimeout(upTime.to);
};

const formatTimePart = (val) => {
    const valString = val + "";
    if (valString.length < 2) {
        return "0" + valString;
    } else {
        return valString;
    }
};

const addMessage = m => {
    const messageBlock = $(`<div> <h4> ${m['datetime']} </h4>  <p> ${m['text']} </p> </div>`);
    $("#alerts_container .w3-panel").addClass("w3-gray");
    $("#alerts_container").prepend(messageBlock);
};

const displayPicture = (picture) => {
    $("#current_picture").attr("src", picture.imgURL);
    $("#current_picture_title").text(picture.title);
    $("#current_picture_author").text(picture.author);
    $("#current_picture_starting_price").text(picture.startPrice);
    $("#current_picture_price").text(picture.startPrice);
    $("#current_picture_min_step").text(picture.minStep);
    $("#current_picture_max_step").text(picture.maxStep);
};

const upTime = (countTo) => {
    const now = new Date();
    countTo = new Date(countTo);
    const difference = (now - countTo);

    const days = Math.floor(difference/(60*60*1000*24));
    const hours = Math.floor((difference%(60*60*1000*24))/(60*60*1000));
    const mins = Math.floor(((difference%(60*60*1000*24))%(60*60*1000))/(60*1000));
    const secs = Math.floor((((difference%(60*60*1000*24))%(60*60*1000))%(60*1000))/1000);

    $("#auction_timer #days").text(formatTimePart(days));
    $("#auction_timer #hours").text(formatTimePart(hours));
    $("#auction_timer #minutes").text(formatTimePart(mins));
    $("#auction_timer #seconds").text(formatTimePart(secs));

    clearTimeout(upTime.to);
    upTime.to = setTimeout(() => {
        upTime(countTo);
    }, 1000);

};

const startPictureCountDown = (timestamp) => {
    pictureTimeOut = timestamp + 2;

    let interval = setInterval(() => {
        const now = new Date().getTime();
        const difference = pictureTimeOut - now;

        if (fullTimeOut === undefined) {
            fullTimeOut = difference;
        }

        prev = prev + 1000;


        const mins = Math.floor(((difference%(60*60*1000*24))%(60*60*1000))/(60*1000));
        const secs = Math.floor((((difference%(60*60*1000*24))%(60*60*1000))%(60*1000))/1000);

        $("#picture_timer #picture_minutes").text(formatTimePart(mins));
        $("#picture_timer #picture_seconds").text(formatTimePart(secs));

        if (difference < 0) {
            clearInterval(interval);
            $("#picture_timer #picture_minutes").text('00');
            $("#picture_timer #picture_seconds").text('00');
            prev = 0;
            fullTimeOut = undefined;
        }

    }, 1000);
};

const init = p => {
    socket = io.connect('http://localhost:8888');
    socket.on('message', r => {
        r = JSON.parse(r);
        addMessage(r.message);
    });

    socket.on('auctionStarted', r => {
        r = JSON.parse(r);
        addMessage(r.message);
        startAuctionTimer(r.payload.startTime);
    });

    socket.on('pictureAuctionStarted', r => {
        r = JSON.parse(r);
        addMessage(r.message);
        displayPicture(r.payload['painting']);
        $("#picture_container").fadeIn();
        $("#picture_timer_block").show();
        startPictureCountDown(r.payload.timeout);
    });


    socket.on('pictureAuctionFinished', r => {
        r = JSON.parse(r);
        addMessage(r.message);
    });

    socket.on('auctionFinished', r => {
       r = JSON.parse(r);
       addMessage(r.message);
       stopAuctionTimer()
    });

    socket.on("applyCompleted", r => {
        r = JSON.parse(r);
        addMessage(r.message);
        $("#apply").fadeOut();
    });

    socket.on("changePrice", r => {
        r = JSON.parse(r);
        $("#current_picture_price").text(r.payload.newPrice);
    });

    socket.on("changeParticipantCash", r => {
        r = JSON.parse(r);
        addMessage(r.message);
        $("#participant_cache").text(r.payload.cashReserve);
    });
};


function connect(participant){
    $("#participant_name").text(participant['name']);
    $("#participant_cache").text(participant['cashReserve']);
    $("#participant_image").attr("src",participant['imgURL']);
    init(participant)
    $("#auctionBlock").fadeIn();
    console.log(socket.id)
}

$(document).ready(() => {
    $('#joinAuction').click(() => {
        const selectValue = $('#participantSelector').val()
        console.log(selectValue);
        curP = selectValue;
        if(selectValue == null) {
            return false;
        }
        else {
            $.ajax({
                url:  '/get_participant/'+ `?pID=${selectValue}`,
                method: 'GET',
                success: (participant) => {
                    connect(participant);
                    $("#participant_modal").fadeOut();
                    console.log(curP)
                },
                error: (e) => {
                    console.log('Error: ' + e);
                }
            });
        }
    });


    $("#logout").click(() => {
        location.reload();
    });

    $("#up_price").click(() => {
        socket.emit('voteNewPrice', JSON.stringify({
            payload: {
                pID: curP,
                newPrice: $('#new_price').val()
            }
        }))
    });

    $("#apply").click(() => {
        socket.emit("apply", JSON.stringify({
            payload: {
                pID: curP,
            }
        }));
    });

    $("#bought_pictures_show").click(() => {
        $.ajax({
            url: '/get_participant_paintings' + `?pID=${curP}`,
            method: 'GET',
            success: (response) => {
                const boughtPicturesContainer =  $("#bought_pictures_container");
                $(boughtPicturesContainer).empty();
                for (let painting of response) {
                    $(boughtPicturesContainer).append($(`
                        <div class="w3-panel w3-margin w3-padding">
                            <div class="w3-container">
                                <div class="w3-third">
                                    <img src="${painting.imgURL}" style="height: 5vh">
                                </div>
                                <div class="w3-twothird">
                                    <p>${painting.title}</p>
                                    <p>${painting.author}</p>
                                    <p>Куплена за ${painting.startPrice}</p>
                                </div>
                            </div>
                        </div>
                    `));
                }
                $("#bought_pictures_modal").fadeIn();
            },
            error: (e) => {
                console.log('Error: ' + e);
            }
        });
    });

})

