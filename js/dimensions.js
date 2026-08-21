/**
 * AI Measurement 4.0 - Backend Logic (ES3 Compatible)
 * Creates measurement lines: height, width, center, radius, diameter for selected objects.
 */
//@target illustrator

var AIMeasurment = (function () {

    var PT_TO_MM = 2.834645668;
    var MM_TO_PT = 0.352777778;

    // --- Helpers ---
    function makeRandStr(len) {
        return ('1' + (new Date()) * Math.random() * 10000).slice(0, len);
    }

    function parseScale(val) {
        if (typeof val === 'number') return (val > 0) ? val : 1;
        if (!val || typeof val !== 'string') return 1;
        val = val.replace(/\s+/g, '');
        if (val.indexOf(':') !== -1) {
            var parts = val.split(':');
            var left = parseFloat(parts[0]);
            var right = parseFloat(parts[1]);
            if (!isNaN(left) && !isNaN(right) && left > 0 && right > 0) {
                return right / left;
            }
        }
        var num = parseFloat(val);
        if (!isNaN(num) && num > 0) {
            return num;
        }
        return 1;
    }

    function setCmyk(comp) {
        var col = new CMYKColor();
        col.cyan = comp[0];
        col.magenta = comp[1];
        col.yellow = comp[2];
        col.black = comp[3];
        return col;
    }

    function getFontsAvailable() {
        var fonts = [];
        var fontNamesArray = [
            'MyriadPro-BoldCond', 'MyriadPro-Black', 'MyriadPro-Bold', 'MyriadPro-Regular',
            'MyriadPro-Cond', 'Monaco-Bold',
            'Arial-Bold', 'Arial-BoldMT', 'Arial-Black',
            'ComicSansMS-Bold', 'Calibri-Bold', 'CourierNewPS-BoldMT', 'Courier-Bold',
            'Charcoal', 'DejaVuSans-Bold', 'Geneva-Bold', 'Impact',
            'Nimbus-Sans-Bold', 'NimbusMonoL-Bold', 'TrebuchetMS-Bold', 'Tahoma-Bold',
            'Verdana-Bold'
        ];
        for (var i = 0; i < fontNamesArray.length; i++) {
            try {
                fonts.push(textFonts.getByName(fontNamesArray[i]).name);
            } catch (e) {}
        }
        return fonts;
    }

    // --- Geometry Helpers ---
    function _compareBounds(elem, boundsToCompare) {
        var elemBounds = elem.geometricBounds;
        if (elemBounds[0] < boundsToCompare[0]) boundsToCompare[0] = elemBounds[0];
        if (elemBounds[1] > boundsToCompare[1]) boundsToCompare[1] = elemBounds[1];
        if (elemBounds[2] > boundsToCompare[2]) boundsToCompare[2] = elemBounds[2];
        if (elemBounds[3] < boundsToCompare[3]) boundsToCompare[3] = elemBounds[3];
        return boundsToCompare;
    }

    function getBounds(selElem, bounds) {
        var clipGroupElems, i, j;
        if (selElem.typename !== 'GroupItem') {
            return selElem.geometricBounds;
        }
        if (selElem.clipped) {
            clipGroupElems = selElem.pathItems;
            for (i = 0; i < clipGroupElems.length; i++) {
                if (clipGroupElems[i].clipping) {
                    if (bounds === '') {
                        bounds = clipGroupElems[i].geometricBounds;
                        continue;
                    }
                    bounds = _compareBounds(clipGroupElems[i], bounds);
                }
            }
            return bounds;
        }

        for (j = 0; j < selElem.pageItems.length; j++) {
            var el = selElem.pageItems[j];
            if (el.typename !== 'GroupItem') {
                if (bounds === '') {
                    bounds = el.geometricBounds;
                    continue;
                }
                bounds = _compareBounds(el, bounds);
            }

            if (el.typename === 'GroupItem' && el.clipped) {
                clipGroupElems = el.pathItems;
                for (i = 0; i < clipGroupElems.length; i++) {
                    if (clipGroupElems[i].clipping) {
                        if (bounds === '') {
                            bounds = clipGroupElems[i].geometricBounds;
                            continue;
                        }
                        bounds = _compareBounds(clipGroupElems[i], bounds);
                    }
                }
                continue;
            }

            if (el.typename === 'GroupItem' && !el.groupItems && !el.clipped) {
                if (bounds === '') {
                    bounds = el.geometricBounds;
                    continue;
                }
                bounds = _compareBounds(el.geometricBounds, bounds);
                continue;
            }

            if (el.typename === 'GroupItem' && el.groupItems) {
                for (var l = 0; l < el.pageItems.length; l++) {
                    bounds = getBounds(el.pageItems[l], bounds);
                }
            }
        }
        return bounds;
    }

    function getRectByVertGap(sel) {
        var tp_bnds = getBounds(sel[0], []);
        var bt_bnds = getBounds(sel[1], []);
        var left, top, right, bottom;

        if (tp_bnds[3] > bt_bnds[1]) {
            top = tp_bnds[3];
            bottom = bt_bnds[1];
        } else if (bt_bnds[3] > tp_bnds[1]) {
            top = bt_bnds[3];
            bottom = tp_bnds[1];
        } else {
            return false;
        }

        left = tp_bnds[0] <= bt_bnds[0] ? tp_bnds[0] : bt_bnds[0];
        right = tp_bnds[2] >= bt_bnds[2] ? tp_bnds[2] : bt_bnds[2];
        return [left, top, right, bottom];
    }

    function getRectByHorizGap(sel) {
        var tp_bnds = getBounds(sel[0], []);
        var bt_bnds = getBounds(sel[1], []);
        var left, top, right, bottom;

        if (tp_bnds[2] < bt_bnds[0]) {
            left = tp_bnds[2];
            right = bt_bnds[0];
        } else if (bt_bnds[2] < tp_bnds[0]) {
            left = bt_bnds[2];
            right = tp_bnds[0];
        } else {
            return false;
        }

        top = tp_bnds[1] >= bt_bnds[1] ? tp_bnds[1] : bt_bnds[1];
        bottom = tp_bnds[3] <= bt_bnds[3] ? tp_bnds[3] : bt_bnds[3];
        return [left, top, right, bottom];
    }

    function isCircle(elem) {
        try {
            var elW = elem.width;
            var elH = elem.height;
            var difBox = 0;
            if (elW > elH) {
                difBox = 100 * (1 - elH / elW);
            } else if (elW < elH) {
                difBox = 100 * (1 - elW / elH);
            }
            if (difBox > 2) return false;

            var difS = Math.abs(Math.pow((elW / 2), 2) * Math.PI * 100 / Math.abs(elem.area) - 100);
            if (difS > 2) return false;

            return true;
        } catch (e) {
            return false;
        }
    }


    // --- Core Measurement Execution ---
    function executeMeasure(u, iterator) {
        var side = u.side;
        var strkW = u.strkW;
        var units = u.units ? ' ' + u.units : '';
        var arW = u.arW;
        var gap = u.gap;
        var stopBot = u.stopBot;
        var stopTop = u.stopTop + 1;
        var fontSize = u.fontSize;
        var precis = u.precis;
        var measType = u.measType;
        var addLay = u.addLay;
        var layName = u.layName;
        var outArtboard = u.outArtboard;

        var arH = arW / 1.9;
        var col = setCmyk(u.colComp);
        var fontName = getFontsAvailable()[u.fontNum || 0];

        var bounds, left, right, top, bott, elW, elH, rect;

        if (iterator !== -1) {
            bounds = getBounds(selection[iterator], []);
            left = bounds[0];
            right = bounds[2];
            top = bounds[1];
            bott = bounds[3];
            elW = right - left;
            elH = top - bott;
        } else if (measType === 'linear') {
            switch (side) {
                case 'top':
                case 'bott':
                    rect = getRectByHorizGap(selection);
                    break;
                case 'left':
                case 'right':
                    rect = getRectByVertGap(selection);
                    break;
            }
            if (rect === false) return;
            left = rect[0];
            top = rect[1];
            right = rect[2];
            bott = rect[3];
            elW = right - left;
            elH = top - bott;
        }

        if (outArtboard && activeDocument && activeDocument.artboards && activeDocument.artboards.length > 0 && measType === 'linear') {
            var abIdx = activeDocument.artboards.getActiveArtboardIndex();
            var abRect = activeDocument.artboards[abIdx].artboardRect;
            switch (side) {
                case 'top': top = abRect[1]; break;
                case 'bott': bott = abRect[3]; break;
                case 'left': left = abRect[0]; break;
                case 'right': right = abRect[2]; break;
            }
        }

        var p = Math.pow(10, precis);
        var unitType = u.unitType || 'mm';
        var unitScale = 2.834645668;
        if (unitType === 'cm') unitScale = 28.34645668;
        else if (unitType === 'in') unitScale = 72.0;
        else if (unitType === 'pt' || unitType === 'px') unitScale = 1.0;

        var scaleVal = (u.scale !== undefined) ? parseScale(u.scale) : 1;

        var lablW = Math.round((elW * scaleVal) / (unitScale / p)) / p;
        var lablH = Math.round((elH * scaleVal) / (unitScale / p)) / p;
        var lablR = Math.round(((elW * scaleVal) / 2) / (unitScale / p)) / p;

        var lay, meas, txt;

        try {
            lay = activeDocument.layers.getByName(layName);
            if (lay.visible === false || lay.locked === true) {
                if (addLay) {
                    lay = activeDocument.layers.add();
                    lay.name = layName;
                } else {
                    lay = (iterator !== -1) ? selection[iterator].layer : activeDocument.activeLayer;
                }
            }
        } catch (e) {
            if (addLay) {
                lay = activeDocument.layers.add();
                lay.name = layName;
            } else {
                lay = (iterator !== -1) ? selection[iterator].layer : activeDocument.activeLayer;
            }
        }

        meas = lay.groupItems.add();
        if (measType !== 'cent' && measType !== 'diam' && measType !== 'rad') {
            txt = meas.textFrames.add();
        }

        meas.name = makeRandStr(7);

        // --- Drawing sub-routines ---
        function _addLine(points) {
            var line = meas.pathItems.add();
            line.setEntirePath(points);
            line.stroked = true;
            line.strokeWidth = strkW;
            line.strokeCap = StrokeCap.BUTTENDCAP;
            line.strokeDashes = [];
            line.filled = false;
            if (col) line.strokeColor = col;
            return line;
        }

        function _addArrow(points) {
            var arrow = meas.pathItems.add();
            arrow.setEntirePath(points);
            arrow.stroked = true;
            arrow.strokeWidth = strkW;
            arrow.strokeJoin = StrokeJoin.ROUNDENDJOIN;
            arrow.strokeDashes = [];
            arrow.closed = true;
            if (col) {
                arrow.strokeColor = col;
                arrow.fillColor = col;
            }
            return arrow;
        }

        function _addLabel(content) {
            var labl = txt;
            labl.contents = content;
            labl.paragraphs[0].paragraphAttributes.justification = Justification.CENTER;
            if (col) {
                labl.textRange.characterAttributes.fillColor = col;
                if (fontName) labl.textRange.characterAttributes.textFont = textFonts.getByName(fontName);
            }
            labl.textRange.characterAttributes.size = fontSize;
            return labl;
        }

        function _addBaseMeas(sideLength) {
            var linePoints, stopPoints, arPoints, lineL, lineR, stopL, stopR, arL, arR;
            if (txt.width < (sideLength - gap * 2 - arW * 3)) {
                txt.position = [sideLength / 2 - txt.width / 2, stopTop];
                linePoints = [[0, stopTop - txt.height / 2], [sideLength / 2 - txt.width / 2 - gap / 2, stopTop - txt.height / 2]];
                lineL = _addLine(linePoints);
                lineR = lineL.duplicate();
                lineR.translate(lineL.width + txt.width + gap);

                stopPoints = [[0, stopBot], [0, stopTop]];
                stopL = _addLine(stopPoints);
                stopR = stopL.duplicate();
                stopR.translate(sideLength);

                arPoints = [[arW, stopTop - txt.height / 2 - arH / 2], [0, stopTop - txt.height / 2], [arW, stopTop - txt.height / 2 + arH / 2]];
                arL = _addArrow(arPoints);
                arR = arL.duplicate();
                arR.rotate(180);
                arR.translate(sideLength - arW);

            } else {
                if (txt.width < sideLength - arW) {
                    txt.position = [sideLength / 2 - txt.width / 2, stopTop];
                } else {
                    txt.position = [sideLength + arW * 2 + gap, stopTop];
                }
                linePoints = [[0, stopTop - txt.height / 2], [-arW * 2, stopTop - txt.height / 2]];
                lineL = _addLine(linePoints);
                lineR = lineL.duplicate();
                lineR.translate(lineL.width + sideLength);

                stopPoints = [[0, stopBot], [0, stopTop]];
                stopL = _addLine(stopPoints);
                stopR = stopL.duplicate();
                stopR.translate(sideLength);

                arPoints = [[arW, stopTop - txt.height / 2 - arH / 2], [0, stopTop - txt.height / 2], [arW, stopTop - txt.height / 2 + arH / 2]];
                arL = _addArrow(arPoints);
                arR = arL.duplicate();
                arR.translate(sideLength);
                arL.rotate(180, true, true, true, true, Transformation.LEFT);
            }
            return meas;
        }

        // --- Execution Branches ---
        if (measType === 'linear') {
            switch (side) {
                case 'top':
                    txt = _addLabel(lablW + units);
                    meas = _addBaseMeas(elW);
                    meas.position = (txt.width < (elW - gap * 2 - arW * 3)) ? [left, top + stopTop] : [left - arW * 2, top + stopTop];
                    break;
                case 'bott':
                    txt = _addLabel(lablW + units);
                    meas = _addBaseMeas(elW);
                    meas.rotate(180);
                    meas.textFrames[0].rotate(180);
                    if (txt.width < (elW - gap * 2 - arW * 3)) {
                        meas.position = [left, bott - stopBot];
                    } else {
                        if (txt.width > elW - arW) {
                            meas.textFrames[0].translate(elW + txt.width + arW * 4 + gap * 2);
                        }
                        meas.position = [left - arW * 2, bott - stopBot];
                    }
                    break;
                case 'left':
                    txt = _addLabel(lablH + units);
                    meas = _addBaseMeas(elH);
                    meas.rotate(90);
                    if (txt.height < (elH - gap * 2 - arW * 3)) {
                        meas.position = [left - meas.width - stopBot, top];
                    } else {
                        meas.position = (txt.height > elH - arW) ? 
                            [left - meas.width - stopBot, top + txt.height + arW * 2 + gap] : 
                            [left - meas.width - stopBot, top + arW * 2];
                    }
                    break;
                case 'right':
                    txt = _addLabel(lablH + units);
                    meas = _addBaseMeas(elH);
                    meas.rotate(-90);
                    meas.textFrames[0].rotate(180);
                    if (txt.height < (elH - gap * 2 - arW * 3)) {
                        meas.position = [right + stopBot, top];
                    } else {
                        meas.position = [right + stopBot, top + arW * 2];
                        if (txt.height > elH - arW) {
                            meas.textFrames[0].translate(0, txt.height + elH + arW * 4 + gap * 2);
                        }
                    }
                    break;
            }
        } else if (measType === 'rad') {
            if (!isCircle(selection[iterator])) {
                meas.remove();
                return;
            }
            var xr = left + elW / 2 + (elW / 2) / Math.sqrt(2);
            var yr = top - elH / 2 + (elH / 2) / Math.sqrt(2);
            _addLine([[0, 0], [elW / 2, 0]]);
            if (elW / 2 > (arW + strkW)) {
                var ar0r = _addArrow([[arW, arH / 2], [0, 0], [arW, -arH / 2]]);
                ar0r.rotate(180);
                ar0r.translate(elW / 2 - arW);
                meas.position = [left + elW / 2, top - elH / 2 + arH / 2];
            } else {
                meas.position = [left + elW / 2, top - elH / 2];
            }
            meas.rotate(45, true, false, false, false, Transformation.LEFT);
            var lineR_rad = _addLine([[xr, yr], [xr + stopTop, yr + stopTop], [xr + stopTop * 2, yr + stopTop]]);
            txt = meas.textFrames.add();
            txt = _addLabel('R ' + lablR + units);
            txt.position = [lineR_rad.position[0] + lineR_rad.width + gap, lineR_rad.position[1] + txt.height / 2];

        } else if (measType === 'diam') {
            if (!isCircle(selection[iterator])) {
                meas.remove();
                return;
            }
            var xd = left + elW / 2 + (elW / 2) / Math.sqrt(2);
            var yd = top - elH / 2 + (elH / 2) / Math.sqrt(2);
            _addLine([[0, 0], [elW, 0]]);
            if (elW > (arW + strkW) * 2) {
                var ar0d = _addArrow([[arW, arH / 2], [0, 0], [arW, -arH / 2]]);
                var ar1d = ar0d.duplicate();
                ar1d.rotate(180);
                ar1d.translate(elW - arW);
                meas.position = [left, top - elH / 2 + arH / 2];
            } else {
                meas.position = [left, top - elH / 2];
            }
            meas.rotate(45);
            var lineD = _addLine([[xd, yd], [xd + stopTop, yd + stopTop], [xd + stopTop * 2, yd + stopTop]]);
            txt = meas.textFrames.add();
            txt = _addLabel('\u00d8 ' + lablW + units);
            txt.position = [lineD.position[0] + lineD.width + gap, lineD.position[1] + txt.height / 2];

        } else if (measType === 'cent') {
            var N = 9, N_HOR = N, N_VER = N;
            var cx = left + elW / 2;
            var cy = top - elH / 2;
            if (elW < N_HOR * 6) N_HOR = elW / 6;
            if (elH < N_VER * 6) N_VER = elH / 6;

            var shrtHor = _addLine([[cx, cy], [cx + N_HOR, cy]]);
            shrtHor.duplicate().rotate(180, true, true, true, true, Transformation.LEFT);

            var shrtVer = _addLine([[cx, cy], [cx, cy + N_VER]]);
            shrtVer.duplicate().rotate(180, true, true, true, true, Transformation.BOTTOM);

            var longHor = _addLine([[cx + 2 * N_HOR, cy], [right + N, cy]]);
            longHor.duplicate().translate(-longHor.width - 4 * N_HOR);

            var longVer = _addLine([[cx, top + N], [cx, cy + 2 * N_VER]]);
            longVer.duplicate().translate(0, -longVer.height - 4 * N_VER);
        }

        return meas.name;
    }

    // --- Public API ---
    return {
        run: function(u) {
            if (!selection || !selection[0]) {
                return;
            }
            var res = [];
            if (selection.length === 2 && u.ctrl === true) {
                if ((selection[0].name).match(/\d{7}/) || (selection[1].name).match(/\d{7}/)) return;
                res[0] = executeMeasure(u, -1);
                return JSON.stringify(res);
            }

            for (var i = 0; i < selection.length; i++) {
                if ((selection[i].name).match(/\d{7}/)) continue;
                res[i] = executeMeasure(u, i);
            }
            return JSON.stringify(res);
        },

        deleteByName: function(name) {
            try {
                var el = activeDocument.groupItems.getByName(name);
                if (selection && selection[0]) {
                    el.remove();
                    return true;
                }
            } catch (e) {
                return false;
            }
        },

        deleteAll: function() {
            if (!app.documents.length) return 0;
            var doc = app.activeDocument;
            var count = 0;
            try {
                for (var i = doc.groupItems.length - 1; i >= 0; i--) {
                    var grp = doc.groupItems[i];
                    try {
                        if (grp.name && grp.name.match(/^\d{7}$/)) {
                            grp.remove();
                            count++;
                        }
                    } catch (eG) {}
                }
            } catch (e) {}
            return count;
        }
    };

})();

// --- Expose Legacy Globals for Panel API ---
function measAllSelect(u) {
    return AIMeasurment.run(u);
}

function delMeasByName(name) {
    return AIMeasurment.deleteByName(name);
}

function delAllMeasurements() {
    return AIMeasurment.deleteAll();
}
