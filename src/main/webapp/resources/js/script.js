let waypoints = [];
let splinePoints = [];
let ctx;
let ctxBackground;
let image;
let imageFlipped;
let wto;
let rows = [];
let change = "propertychange change click keyup input paste";
let animating = false;
let overwrite;
let isClicked = false;
let tank = true;

let xScale = (648 / 717.5); 
let yScale = 324 / 353; 
let scale = 648 / 692;
const fieldHeight = 324.00; // inches
const fieldWidth = 648; // inches
let xOffset = 50;
let yOffset = 150;
const height = 360; //pixels
const width = 756; //

const newScaleZeroValue = 10;

const canvasXOffset = 298;
const canvasYOffset = 50;

const robotWidth = 35; // inches
const robotHeight = 35; // inches


const waypointRadius = 7;
const splineWidth = 2;

const kEps = 1E-9;
const pi = Math.PI;



class Translation2d {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    norm() {
        return Math.hypot(this.x, this.y);
    }

    norm2() {
        return this.x * this.x + this.y * this.y;
    }

    translateBy(other) {
        return new Translation2d(this.x + other.x, this.y + other.y);
    }

    rotateBy(rotation) {
        return new Translation2d(this.x * rotation.cos - this.y * rotation.sin, this.x * rotation.sin + this.y * rotation.cos);
    }

    direction() {
        return new Rotation2d(this.x, this.y, true);
    }

    inverse() {
        return new Translation2d(-this.x, -this.y);
    }

    interpolate(other, x) {
        if (x <= 0) {
            return new Translation2d(this.x, this.y);
        } else if (x >= 1) {
            return new Translation2d(other.x, other.y);
        }
        return this.extrapolate(other, x);
    }

    extrapolate(other, x) {
        return new Translation2d(x * (other.x - this.x) + this.x, x * (other.y - this.y) + this.y);
    }

    scale(s) {
        return new Translation2d(this.x * s, this.y * s);
    }

    static dot(a, b) {
        return a.x * b.x + a.y * b.y;
    }

    static getAngle(a, b) {
        let cos_angle = this.dot(a, b) / (a.norm() * b.norm());
        if (Double.isNaN(cos_angle)) {
            return new Rotation2d(1, 0, false);
        }

        return Rotation2d.fromRadians(Math.acos(Math.min(1.0, Math.max(cos_angle, -1.0))));
    }

    static cross(a, b) {
        return a.x * b.y - a.y * b.x;
    }

    distance(other) {
        return this.inverse().translateBy(other).norm();
    }

    draw(color, radius) {
        color = color || "#2CFF2C";
        ctx.beginPath();
        ctx.arc(this.drawX, this.drawY, radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.fill();
        ctx.lineWidth = 0;
        ctx.stroke();
    }


    get drawX() {
        return (this.x + xOffset) * (width / fieldWidth);
    }

    get drawY() {
        // console.log("Y", this.y);
        // console.log("yOffset", yOffset);
        return height - (this.y + yOffset) * (height / fieldHeight);
    }
}

class Rotation2d {
    constructor(x, y, normalize) {
        this.cos = x;
        this.sin = y;
        this.normalize = normalize;
        if (normalize) {
            this.normalizeFunc();
        }
    }

    static fromRadians(angle_radians) {
        return new Rotation2d(Math.cos(angle_radians), Math.sin(angle_radians), false);
    }

    static fromDegrees(angle_degrees) {
        return this.fromRadians(d2r(angle_degrees));
    }

    normalizeFunc() {
        let magnitude = Math.hypot(this.cos, this.sin);
        if (magnitude > kEps) {
            this.cos /= magnitude;
            this.sin /= magnitude;
        } else {
            this.sin = 0;
            this.cos = 1;
        }
    }

    tan() {
        if (Math.abs(this.cos) < kEps) {
            if (this.sin >= 0.0) {
                return Number.POSITIVE_INFINITY;
            } else {
                return Number.NEGATIVE_INFINITY;
            }
        }
        return this.sin / this.cos;
    }

    getRadians() {
        return Math.atan2(this.sin, this.cos);
    }

    getDegrees() {
        return r2d(this.getRadians());
    }

    rotateBy(other) {
        return new Rotation2d(this.cos * other.cos - this.sin * other.sin,
            this.cos * other.sin + this.sin * other.cos, true);
    }

    normal() {
        return new Rotation2d(-this.sin, this.cos, false);
    }

    inverse() {
        return new Rotation2d(this.cos, -this.sin, false);
    }

    interpolate(other, x) {
        if (x <= 0) {
            return new Rotation2d(this.cos, this.sin, this.normalize);
        } else if (x >= 1) {
            return new Rotation2d(other.cos, other.sin, other.normalize);
        }
        let angle_diff = this.inverse().rotateBy(other).getRadians();
        return this.rotateBy(Rotation2d.fromRadians(angle_diff * x));
    }

    distance(other) {
        return this.inverse().rotateBy(other).getRadians();
    }
}

class Pose2d {
    constructor(translation, rotation, name, enabled) {
        this.translation = translation;
        this.rotation = rotation;
        this.name = name || "";
        this.enabled = enabled;
    }

    static exp(delta) {
        let sin_theta = Math.sin(delta.dtheta);
        let cos_theta = Math.cos(delta.dtheta);
        let s, c;

        if (Math.abs(delta.dtheta) < kEps) {
            s = 1.0 - 1.0 / 6.0 * delta.dtheta * delta.dtheta;
            c = .5 * delta.dtheta;
        } else {
            s = sin_theta / delta.dtheta;
            c = (1.0 - cos_theta) / delta.dtheta;
        }

        return new Pose2d(new Translation2d(delta.dx * s - delta.dy * c, delta.dx * c + delta.dy * s),
            new Rotation2d(cos_theta, sin_theta, false));
    }

    static log(transform) {
        let dtheta = transform.getRotation().getRadians();
        let half_dtheta = 0.5 * dtheta;
        let cos_minus_one = transform.getRotation().cos() - 1.0;
        let halftheta_by_tan_of_halfdtheta;
        if (Math.abs(cos_minus_one) < kEps) {
            halftheta_by_tan_of_halfdtheta = 1.0 - 1.0 / 12.0 * dtheta * dtheta;
        } else {
            halftheta_by_tan_of_halfdtheta = -(half_dtheta * transform.getRotation().sin()) / cos_minus_one;
        }
        let translation_part = transform.getTranslation()
            .rotateBy(new Rotation2d(halftheta_by_tan_of_halfdtheta, -half_dtheta, false));
        return new Twist2d(translation_part.x(), translation_part.y(), dtheta);
    }

    get getTranslation() {
        return this.translation;
    }

    get getRotation() {
        return this.rotation;
    }

    get getEnabled() {
        return this.enabled;
    }

    transformBy(other) {
        return new Pose2d(this.translation.translateBy(other.translation.rotateBy(this.rotation)),
            this.rotation.rotateBy(other.rotation));
    }

    inverse() {
        let rotation_inverted = this.rotation.inverse();
        return new Pose2d(this.translation.inverse().rotateBy(rotation_inverted), rotation_inverted);
    }

    normal() {
        return new Pose2d(this.translation, this.rotation.normal());
    }

    interpolate(other, x) {
        if (x <= 0) {
            return new Pose2d(this.translation, this.rotation, this.name);
        } else if (x >= 1) {
            return new Pose2d(other.translation, other.rotation, other.name);
        }
        let twist = Pose2d.log(this.inverse().transformBy(other));
        return this.transformBy(Pose2d.exp(twist.scaled(x)));
    }

    distance(other) {
        return Pose2d.log(this.inverse().transformBy(other)).norm();
    }

    heading(other) {
        return Math.atan2(this.translation.y - other.translation.y, this.translation.x - other.translation.x);
    }

    draw(drawHeading, radius) {
        this.translation.draw(null, radius);

        if (!drawHeading) {
            return;
        }

        let x = this.translation.drawX;
        let y = this.translation.drawY;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 25 * Math.cos(-this.rotation.getRadians()), y + 25 * Math.sin(-this.rotation.getRadians()));
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.closePath();
    }

    toString() {
        return "new Pose2d(new Translation2d(" + this.translation.x + ", " + this.translation.y + "), new Rotation2d(" + this.rotation.cos + ", " + this.rotation.sin + ", " + this.rotation.normalize + "))";
    }

    transform(other) {
        other.position.rotate(this.rotation);
        this.translation.translate(other.translation);
        this.rotation.rotate(other.rotation);
    }
    getDeclaration() {
        return `Pose2d k${this.name} = new Pose2d(new Translation2d(${this.translation.x}, ${this.translation.y}), Rotation2d.fromDegrees(${this.rotation.getDegrees()}));\n`;
    }
    getVarName() {
        return `k${this.name}`;
    }
}

function d2r(d) {
    return d * (Math.PI / 180);
}

function r2d(r) {
    return r * (180 / Math.PI);
}

function setOffset() {
    let x1 = document.getElementById('xID').value;
    let y1 = document.getElementById('yID').value;
    setStartingPoint(x1, y1);

}

function fillRobot(position, heading, color) {
    let previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "destination-over";

    let translation = position.translation;

    ctx.translate(translation.drawX, translation.drawY);
    ctx.rotate(-heading);

    let w = robotWidth * (width / fieldWidth);
    let h = robotHeight * (height / fieldHeight);
    ctx.fillStyle = color || "rgba(0, 0, 0, 0)";
    ctx.fillRect(-h / 2, -w / 2, h, w);

    ctx.rotate(heading);
    ctx.translate(-translation.drawX, -translation.drawY);

    ctx.globalCompositeOperation = previous;
}

let r = Math.sqrt(Math.pow(robotWidth, 2) + Math.pow(robotHeight, 2)) / 2;
let t = Math.atan2(robotHeight, robotWidth);

function drawRobot(position, heading) {
    let h = heading;
    let angles = [h + (pi / 2) + t, h - (pi / 2) + t, h + (pi / 2) - t, h - (pi / 2) - t];

    let points = [];


    angles.forEach(function (angle) {
        let point = new Translation2d((position.translation.x + (r * Math.cos(angle))),
            (position.translation.y + (r * Math.sin(angle))));
        points.push(point);
        point.draw(Math.abs(angle - heading) < pi / 2 ? "#00AAFF" : "#0066FF", splineWidth);
    });
}

function init() {
    let field = $('#field');
    let background = $('#background');
    let canvases = $('#canvases');
    let widthString = width + "px";
    let heightString = height +  "px";

    field.css("width", widthString);
    field.css("height", heightString);
    background.css("width", widthString);
    background.css("height", heightString);
    canvases.css("width", widthString);
    canvases.css("height", heightString);

    ctx = document.getElementById('field').getContext('2d');
    ctx.canvas.width = width;
    console.log("Width" + ctx.canvas.width);
    ctx.canvas.height = height;
    console.log("Height" + ctx.canvas.height);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#FF0000";
    ctx.scale(0.833, 0.833);

    ctxBackground = document.getElementById('background').getContext('2d');
    ctxBackground.canvas.width = width;
    ctxBackground.canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    image = new Image();
    image.src = '/resources/img/2022-Field.png';
    image.onload = function () {
        ctxBackground.drawImage(image, 0, 0, width * 2, height * 2);
        update();
    };
    imageFlipped = new Image();
    imageFlipped.src = '/resources/img/2022-Field.png';
    rebind();

    document.getElementById('field').addEventListener("mousedown", getPoints, false);
    console.log("Height PIXELS" + screen.height);

    document.getElementById("fileUpload").onchange = function (evt) {
        if (!window.FileReader) return;
        var reader = new FileReader();

        reader.onload = function (evt) {
            if (evt.target.readyState != 2) return;
            if (evt.target.error) {
                alert('Error while reading file');
                return;
            }

            filecontent = evt.target.result;

            let rows = (evt.target.result).split("\r\n");
            for (index in rows) {
                if (rows[index]) {
                    rows[index] = (rows[index]).split(",");
                } else {
                    rows.splice(index, 1);
                }
            }
            rows.shift();


            if (overwrite == true) {
                $("tbody").html("");
                overwrite = false;
            }

            for (row of rows) {
                addPoint(
                    [parseInt(row[0]), parseInt(row[1])],
                    parseInt(row[2]),
                    row[3],
                    (row[4] == "true")
                );
            }

            closeModal();
        };

        reader.readAsText(evt.target.files[0]);
    };
}

function clear() {
    ctx.clearRect(0, 0, width * 1.2, height * 1.2);
    ctx.fillStyle = "#FF0000";

    ctxBackground.clearRect(0, 0, width, height);
    ctxBackground.fillStyle = "#FF0000";
    ctxBackground.drawImage(flipped ? imageFlipped : image, 0, 0, width, height);
}

function rebind() {
    let input = $('input');
    input.unbind(change);
    input.bind(change, function () {
        clearTimeout(wto);
        wto = setTimeout(function () {
            update();
        }, 500);
    });
}

//Gets Points x and y coordinate from the click
function getPoints(event) {
    var x = Math.round(event.x);
    var y = Math.round(event.y);
    overwriteLastPoint(x, y);
}

//Takes x, y as parameter. Uses Math to make sure that waypoint is close to where clicked because of difference in coordinate frames
function overwriteLastPoint(x, y) {
    console.log("X"+ x);
    console.log("Y" + y);
    xID = "x" + (waypoints.length - 1);
    yID = "y" + (waypoints.length - 1);
    if (waypoints.length == 1) {
        xOffset = (x - canvasXOffset);
        console.log(xOffset);
        yOffset = (height - y - 60);
        console.log(yOffset);
    } else {
        document.getElementById(xID).value = (x - xOffset - newScaleZeroValue - canvasXOffset);
        document.getElementById(yID).value = (height - y - yOffset - canvasYOffset);
    }
    update();
}


function addPoint(inputXY) {
    if (waypoints.length > 0) prev = waypoints[waypoints.length - 1].translation
    else prev = new Translation2d(0, 0);
    if (inputXY != null) {
        $("tbody").append("<tr>" + "<td class='drag-handler'></td>" +
            "<td class='x'><input type='number' value='" + Math.round(xScale * (prev.x - inputXY[0])) + "'></td>" +
            "<td class='y'><input type='number' value='" + Math.round(yScale * (prev.y - inputXY[1])) + "'></td>" +
            "<td class='heading'><input type='number' value='0'></td>" +
            "<td class='comments'><input type='search' placeholder='Comments'></td>" +
            "<td class='enabled'><input type='checkbox' checked></td>" +
            "<td class='delete'><button onclick='$(this).parent().parent().remove();update()'>&times;</button></td></tr>");
    } else if (waypoints.length != 0) {
        console.log(prev.x);
        $("tbody").append("<tr>" + "<td class='drag-handler'></td>" +
            "<td class='x'><input type='number' value='" + Math.round(scale * prev.x) + "' id = 'x" + (waypoints.length) + "' ></td>" +
            "<td class='x'><input type='number' value='" + Math.round(scale * prev.y) + "' id = 'y" + (waypoints.length) + "' ></td>" +
            "<td class='heading'><input type='number' value='0' ></td>" +
            "<td class='comments'><input type='search' placeholder='Comments'></td>" +
            "<td class='enabled'><input type='checkbox' checked></td>" +
            "<td class='delete'><button onclick='$(this).parent().parent().remove();update()'>&times;</button></td></tr>");
    } else {
        $("tbody").append("<tr>" + "<td class='drag-handler'></td>" +
            "<td class='x'><input type='number' value='" + (0) + "'></td>" +
            "<td class='y'><input type='number' value='" + (0) + "'></td>" +
            "<td class='heading'><input type='number' value='0'></td>" +
            "<td class='comments'><input type='search' placeholder='Comments'></td>" +
            "<td class='enabled'><input type='checkbox' checked></td>" +
            "<td class='delete'><button onclick='$(this).parent().parent().remove();update()'>&times;</button></td></tr>");

    }
    update();
    rebind();
}

function setStartingPoint(x, y) {
    yOffset = Number(y);
    xOffset = Number(x);
    if (waypoints.length == 0) {
        addPoint([0, 0]);
    }
    update();
}

function draw(style) {
    clear();
    drawWaypoints();

    switch (style) {
        // waypoints only
        case 1:
            break;
            // all
        case 2:
            drawSplines(true);
            drawSplines(false);
            break;
        case 3:
            animate();
            break;
    }
}

let count = 0;

function update() {
    rows = [];
    clear();
    if (animating) {
        return;
    }


    waypoints = [];
    let data = "";
    $('tbody').children('tr').each(function () {
        count++;
        let x = Math.round(Math.pow(xScale, -1) * parseInt($($($(this).children()).children()[0]).val()));
        let y = Math.round(Math.pow(yScale, -1) * parseInt($($($(this).children()).children()[1]).val()));
        let heading = parseInt($($($(this).children()).children()[2]).val());
        if (isNaN(heading)) {
            heading = 180;
        }
        let name = ($($($(this).children()).children()[3]).val());
        let enabled = ($($($(this).children()).children()[4]).prop('checked'));
        if (enabled) {
            waypoints.push(new Pose2d(new Translation2d(x, y), Rotation2d.fromDegrees(heading), name, enabled));
            data += x + "," + y + "," + heading + ";";
        }

    });

    rows.push(["X", "Y", "Rotation", "Name", "Enabled", "X-Offset", "Y-Offset"]);
    for (const w of waypoints) {
        rows.push([w.translation.x, w.translation.y, w.rotation.getDegrees(), w.name, w.enabled, xOffset, yOffset]);
    }

    draw(1);

    $.post({
        url: "/api/calculate_splines",
        data: data,
        success: function (data) {
            if (data === "no") {
                return;
            }


            let points = JSON.parse(data).points;

            splinePoints = [];
            for (let i in points) {
                let point = points[i];
                splinePoints.push(new Pose2d(new Translation2d(point.x, point.y), Rotation2d.fromRadians(point.rotation)));
            }

            draw(2);
        }
    });
}

let flipped = false;

function flipField() {
    flipped = !flipped;
    ctx.drawImage(flipped ? imageFlipped : image, 0, 0, width, height);
    update();
}

function changeField(src) {
    console.log(src);
    // let newImage = new Image();
    image.src = "/resources/img/" + src + ".jpg";    
    // console.log(image);
    ctxBackground.clearRect(0, 0, width, height);
    ctxBackground.drawImage(image, 0, 0, width, height);
    update();
}

function showData() {
    update();
    if (getDataString()) {
        $(".modal > pre").text(getDataString());
    } else {
        $(".modal > pre").text("");
    }
    showModal();
}

function showModal() {
    let modal = $(".modal, .shade");
    modal.removeClass("behind");
    modal.removeClass("hide");
}

function closeModal() {
    let modal = $(".modal, .shade");
    modal.addClass("hide");
    setTimeout(function () {
        modal.addClass("behind");
    }, 500);
}

function getDataString() {
    if (waypoints.length <= 1) {
        return false;
    }

    let ret_val = ``;
    for (let i = 0; i < waypoints.length; i++) {
        ret_val += waypoints[i].getDeclaration();
    }

    ret_val += '\n';
    /*for (let i = 0; i < waypoints.length - 1; i++) {
        ret_val += `public final MirroredTrajectory ${waypoints[i].name.charAt(0).toLowerCase() + waypoints[i].name.substring(1) + "To" + waypoints[i + 1].name} = new MirroredTrajectory(get${waypoints[i].name + "To" + waypoints[i + 1].name});\n`;
    }*/

    for (let i = 0; i < waypoints.length - 1; i++) {
        ret_val += `
        private Trajectory<TimedState<Pose2d>> get${waypoints[i].name + "To" + waypoints[i + 1].name}() {
            List<Pose2d> waypoints = new ArrayList<>();
            waypoints.add(${waypoints[i].getVarName()});
            waypoints.add(${waypoints[i + 1].getVarName()});
            return generateTrajectory(false, waypoints, Arrays.asList(), kMaxVel, kMaxAccel, kMaxVoltage);
        }`;
    }
    return ret_val;
}


function drawWaypoints() {
    clear();
    waypoints.forEach(function (waypoint) {
        waypoint.draw(true, waypointRadius);
        drawRobot(waypoint, waypoint.rotation.getRadians());
    });
}

let animation;

function animate() {
    drawSplines(false, true);
}

function drawSplines(fill, animate) {
    animate = animate || false;
    let i = 0;

    if (animate) {
        clearInterval(animation);
        animation = setInterval(function () {
            if (i === splinePoints.length) {
                animating = false;
                clearInterval(animation);
                return;
            }
            animating = true;
            let splinePoint = splinePoints[i];
            let hue = Math.round(180 * (i++/ splinePoints.length));
            let previous = ctx.globalCompositeOperation; fillRobot(splinePoint, splinePoint.rotation.getRadians(), 'hsla(' + hue + ', 100%, 50%, 0.025)'); ctx.globalCompositeOperation = "source-over"; drawRobot(splinePoint, splinePoint.rotation.getRadians()); splinePoint.draw(false, splineWidth); ctx.globalCompositeOperation = previous
        }, 25);
    } else {
        splinePoints.forEach(function (splinePoint) {
        splinePoint.draw(false, splineWidth);
        if (fill) {
            let hue = Math.round(180 * (i++/ splinePoints.length));
            fillRobot(splinePoint, splinePoint.rotation.getRadians(), 'hsla(' + hue + ', 100%, 50%, 0.025)');
        } else {
            drawRobot(splinePoint, splinePoint.rotation.getRadians());
        }
        });
    }
}

function importPoints(fileOverwrite) {
    overwrite = fileOverwrite;
    document.getElementById('fileUpload').click();
}

function exportPoints(fileOverwrite) {
    let csvContent = "data:text/csv;charset=utf-8,";
    for (i = 0; i < rows.length; i++) {
        let row = rows[i].join(",");
        csvContent += row + "\r\n";
    }
    var encodedUri = encodeURI(csvContent);
    var link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "points.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function switchDrive() {
    tank = !tank;
    document.getElementById("drive").textContent = tank ? "Tank" : "Swerve";
}
