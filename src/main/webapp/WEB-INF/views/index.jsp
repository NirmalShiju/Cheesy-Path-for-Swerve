<%@taglib uri='http://java.sun.com/jsp/jstl/core' prefix='c'%>
<!DOCTYPE html>
<html>

<head>
    <title>Cheesy Path</title>

    <script src='https://ajax.googleapis.com/ajax/libs/jquery/3.1.1/jquery.min.js'></script>
    <script src='https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js'></script>
    <script type='text/javascript' src='<c:url value='/resources/js/script.js' />'></script>

    <link rel='shortcut icon' href='https://media.team254.com/homepage/icons/favicon32.png' />
    <link href='https://fonts.googleapis.com/css?family=Roboto' rel='stylesheet'>
    <link href='https://fonts.googleapis.com/css?family=Source+Code+Pro' rel='stylesheet'>
    <link href='https://fonts.googleapis.com/css?family=Source+Code+Pro' rel='stylesheet'>
    <link href='<c:url value='/resources/css/style.css' />' rel='stylesheet'>
</head>

<body onload='init()'>
    <div class='modal hide behind'>
        <div>
            <div class="transferContainer">
                <span class='import' onclick='importPoints(false)'>Import (Append)</span>
                <span class='import' onclick='importPoints(true)'>Import (Overwrite)</span>
                <span class='export' onclick='exportPoints()'>Export</span>
            </div>
            <span id='modalTitle'>TrajectoryGenerator.java</span>
            <span class='close' onclick='closeModal()'>&times;</span>
        </div>
        <pre></pre>
    </div>
    <input id="fileUpload" type="file" style="display: none" />
    <div class='shade hide behind' onclick='closeModal()'></div>
    <div id='canvases'>
        <canvas id='background'></canvas>
        <canvas id='field'></canvas>
    </div>

    <div class='originInput'>
        X-Coordinate:<br>
        <input type="number" name="X-Coordinate(Zero)" id="xID" placeholder="Enter value here..."><br>
        Y-Coordinate:<br>
        <input type="number" name="Y-Coordinate(Zero)" id="yID" placeholder="Enter value here...">
        <input type="submit" value="Set" onclick="setOffset()">
    </div>
    <div class='buttonContainer'>
        <button onclick='addPoint()'>Add Point</button>
        <button onclick='draw(3)'>Animate</button>
        <button onclick='showData()'>Display Path</button>
        <button onclick='switchDrive()' id='drive'>Tank</button>
    </div>
    <table>
        <thead>
            <th></th>
            <th>X</th>
            <th>Y</th>
            <th>Heading</th>
            <th>Name (CamelCase)</th>
            <th>Enabled</th>
            <th>Delete</th>
        </thead>
        <tbody>
            <tr>
                <td class='drag-handler'></td>
                <td class='x'><input type='number' value='0'></td>
                <td class='y'><input type='number' value='0'></td>
                <td class='heading'><input type='number' value='0'></td>
                <td class='name'><input type='search' value='Pose2d1'></td>
                <td class='enabled'><input type='checkbox' checked></td>
                <td class='delete'><button onclick='$(this).parent().parent().remove();update();'>&times;</button></td>
            </tr>
        </tbody>
    </table>
</body>

</html>

<script>
    $('table tbody').sortable({
        helper: fixWidthHelper,
        deactivate: update
    }).disableSelection();

    function fixWidthHelper(e, ui) {
        ui.children().each(function () {
            $(this).width($(this).width());
        });
        return ui;
    }
</script>