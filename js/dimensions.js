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
        var num = Math.floor(1000000 + Math.random() * 9000000);
        return String(num).slice(0, len || 7);
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
        var c = (comp && !isNaN(comp[0])) ? Number(comp[0]) : 0;
        var m = (comp && !isNaN(comp[1])) ? Number(comp[1]) : 0;
        var y = (comp && !isNaN(comp[2])) ? Number(comp[2]) : 0;
        var k = (comp && !isNaN(comp[3])) ? Number(comp[3]) : 100;
        col.cyan = c;
        col.magenta = m;
        col.yellow = y;
        col.black = k;
        return col;
    }

    function applyFontToTextRange(textRange, fontParam) {
        if (!textRange) return;
        var fontCollection = (typeof app !== 'undefined' && app.textFonts) ? app.textFonts : (typeof textFonts !== 'undefined' ? textFonts : null);
        if (!fontCollection) return;

        if (!fontParam || fontParam === 'default' || fontParam === '') {
            var defs = ['MyriadPro-BoldCond', 'MyriadPro-Regular', 'Arial-BoldMT', 'Arial-Bold', 'ArialMT', 'Helvetica'];
            for (var d = 0; d < defs.length; d++) {
                try {
                    textRange.characterAttributes.textFont = fontCollection.getByName(defs[d]);
                    return;
                } catch(eD) {}
            }
            return;
        }
        try {
            textRange.characterAttributes.textFont = fontCollection.getByName(fontParam);
            return;
        } catch(e1) {}
        try {
            var len = fontCollection.length;
            for (var f = 0; f < len; f++) {
                var tf = fontCollection[f];
                if (tf.name === fontParam || tf.family === fontParam) {
                    textRange.characterAttributes.textFont = tf;
                    return;
                }
            }
        } catch(e2) {}
    }

    function formatNumber(num, dec) {
        if (isNaN(num) || !isFinite(num)) return "0";
        var d = parseInt(dec, 10);
        if (isNaN(d) || d < 0) d = 0;
        return Number(num.toFixed(d)).toFixed(d);
    }

    // --- Geometry Helpers ---
    function mergeBounds(b1, b2) {
        if (!b1) return b2;
        if (!b2) return b1;
        return [
            Math.min(b1[0], b2[0]),
            Math.max(b1[1], b2[1]),
            Math.max(b1[2], b2[2]),
            Math.min(b1[3], b2[3])
        ];
    }

    function getItemBounds(elem) {
        if (!elem) return null;

        // If clipped group (clipping mask), only clipping paths define visual bounds
        if (elem.typename === 'GroupItem' && elem.clipped) {
            var clipBounds = null;
            for (var i = 0; i < elem.pageItems.length; i++) {
                var child = elem.pageItems[i];
                if (child.clipping) {
                    var cB = getItemBounds(child);
                    if (cB) {
                        clipBounds = mergeBounds(clipBounds, cB);
                    }
                }
            }
            if (clipBounds) return clipBounds;
        }

        // If regular group, recursively calculate merged bounds of children
        if (elem.typename === 'GroupItem' && elem.pageItems && elem.pageItems.length > 0) {
            var grpBounds = null;
            for (var j = 0; j < elem.pageItems.length; j++) {
                var it = elem.pageItems[j];
                if (it.guides) continue;
                var itemB = getItemBounds(it);
                if (itemB) {
                    grpBounds = mergeBounds(grpBounds, itemB);
                }
            }
            if (grpBounds) return grpBounds;
        }

        // Leaf item / standard PageItem (PathItem, CompoundPathItem, TextFrame, PlacedItem, RasterItem, etc.)
        try {
            var b = elem.geometricBounds;
            if (b && b.length === 4 && !isNaN(b[0]) && !isNaN(b[1]) && !isNaN(b[2]) && !isNaN(b[3])) {
                return [b[0], b[1], b[2], b[3]];
            }
        } catch (e) {}

        return null;
    }

    function getRectByVertGap(sel) {
        if (!sel || sel.length < 2) return null;
        var b1 = getItemBounds(sel[0]);
        var b2 = getItemBounds(sel[1]);
        if (!b1 || !b2) return null;

        // In Illustrator, top Y is greater than bottom Y (top > bottom)
        var topObj = (b1[1] >= b2[1]) ? b1 : b2;
        var botObj = (b1[1] >= b2[1]) ? b2 : b1;

        var top = topObj[3];    // bottom edge of upper object
        var bottom = botObj[1]; // top edge of lower object

        if (top <= bottom) {
            top = Math.max(topObj[3], botObj[1]);
            bottom = Math.min(topObj[3], botObj[1]);
            if (top === bottom) top = bottom + 1;
        }

        var left = Math.min(b1[0], b2[0]);
        var right = Math.max(b1[2], b2[2]);
        var overlapLeft = Math.max(b1[0], b2[0]);
        var overlapRight = Math.min(b1[2], b2[2]);
        if (overlapRight > overlapLeft) {
            left = overlapLeft;
            right = overlapRight;
        }

        return [left, top, right, bottom];
    }

    function getRectByHorizGap(sel) {
        if (!sel || sel.length < 2) return null;
        var b1 = getItemBounds(sel[0]);
        var b2 = getItemBounds(sel[1]);
        if (!b1 || !b2) return null;

        var leftObj = (b1[0] <= b2[0]) ? b1 : b2;
        var rightObj = (b1[0] <= b2[0]) ? b2 : b1;

        var left = leftObj[2];   // right edge of leftmost object
        var right = rightObj[0];  // left edge of rightmost object

        if (right <= left) {
            left = Math.min(leftObj[2], rightObj[0]);
            right = Math.max(leftObj[2], rightObj[0]);
            if (right === left) right = left + 1;
        }

        var top = Math.max(b1[1], b2[1]);
        var bottom = Math.min(b1[3], b2[3]);
        var overlapTop = Math.min(b1[1], b2[1]);
        var overlapBot = Math.max(b1[3], b2[3]);
        if (overlapTop > overlapBot) {
            top = overlapTop;
            bottom = overlapBot;
        }

        return [left, top, right, bottom];
    }

    function isCircle(elem) {
        try {
            if (!elem || elem.typename !== 'PathItem') return false;
            var elW = elem.width;
            var elH = elem.height;
            if (elW <= 0 || elH <= 0) return false;
            var difBox = Math.abs(elW - elH) / Math.max(elW, elH) * 100;
            if (difBox > 2) return false;

            var expectedArea = Math.PI * Math.pow(elW / 2, 2);
            var actualArea = Math.abs(elem.area);
            if (actualArea <= 0) return false;
            var difS = Math.abs(expectedArea - actualArea) / expectedArea * 100;
            if (difS > 2) return false;

            return true;
        } catch (e) {
            return false;
        }
    }


    // --- Core Measurement Execution ---
    function executeMeasure(u, iterator) {
        var side = u.side || 'top';
        var strkW = u.strkW;
        var units = u.units ? ' ' + u.units : '';
        var arW = u.arW;
        var gap = u.gap;
        var stopBot = u.stopBot;
        var stopTop = u.stopTop + 1;
        var fontSize = u.fontSize;
        var precis = (u.precis !== undefined) ? u.precis : 2;
        var measType = u.measType;
        var addLay = u.addLay;
        var layName = u.layName;
        var outArtboard = u.outArtboard;

        var arH = arW / 1.9;
        var col = setCmyk(u.colComp);

        var bounds, left, right, top, bott, elW, elH, rect;

        if (iterator !== -1) {
            bounds = getItemBounds(selection[iterator]);
            if (!bounds) return null;
            left = bounds[0];
            right = bounds[2];
            top = bounds[1];
            bott = bounds[3];
            elW = right - left;
            elH = top - bott;
        } else if (measType === 'gap_h' || (measType === 'linear' && (side === 'top' || side === 'bott'))) {
            rect = getRectByHorizGap(selection);
            if (!rect) return null;
            left = rect[0];
            top = rect[1];
            right = rect[2];
            bott = rect[3];
            elW = right - left;
            elH = top - bott;
        } else if (measType === 'gap_v' || (measType === 'linear' && (side === 'left' || side === 'right'))) {
            rect = getRectByVertGap(selection);
            if (!rect) return null;
            left = rect[0];
            top = rect[1];
            right = rect[2];
            bott = rect[3];
            elW = right - left;
            elH = top - bott;
        }

        if (isNaN(elW) || !isFinite(elW) || elW <= 0) elW = 0.001;
        if (isNaN(elH) || !isFinite(elH) || elH <= 0) elH = 0.001;

        if (outArtboard && activeDocument && activeDocument.artboards && activeDocument.artboards.length > 0 && (measType === 'linear' || measType === 'gap_h' || measType === 'gap_v')) {
            var abIdx = activeDocument.artboards.getActiveArtboardIndex();
            var abRect = activeDocument.artboards[abIdx].artboardRect;
            switch (side) {
                case 'top': top = abRect[1]; break;
                case 'bott': bott = abRect[3]; break;
                case 'left': left = abRect[0]; break;
                case 'right': right = abRect[2]; break;
            }
        }

        var unitType = u.unitType || 'mm';
        var unitScale = 2.834645668;
        if (unitType === 'cm') unitScale = 28.34645668;
        else if (unitType === 'in') unitScale = 72.0;
        else if (unitType === 'pt' || unitType === 'px') unitScale = 1.0;

        var scaleVal = (u.scale !== undefined) ? parseScale(u.scale) : 1;

        var valW = (elW * scaleVal) / unitScale;
        var valH = (elH * scaleVal) / unitScale;
        var valR = ((elW * scaleVal) / 2) / unitScale;

        var lablW = formatNumber(valW, precis);
        var lablH = formatNumber(valH, precis);
        var lablR = formatNumber(valR, precis);

        var lay, meas, txt;

        try {
            lay = activeDocument.layers.getByName(layName);
            if (lay.visible === false || lay.locked === true) {
                if (addLay) {
                    lay = activeDocument.layers.add();
                    lay.name = layName;
                } else {
                    lay = (iterator !== -1 && selection[iterator]) ? selection[iterator].layer : activeDocument.activeLayer;
                }
            }
        } catch (e) {
            if (addLay) {
                lay = activeDocument.layers.add();
                lay.name = layName;
            } else {
                lay = (iterator !== -1 && selection[iterator]) ? selection[iterator].layer : activeDocument.activeLayer;
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
            }
            applyFontToTextRange(labl.textRange, u.fontName);
            labl.textRange.characterAttributes.size = fontSize;
            return labl;
        }

        function _addBaseMeas(sideLength) {
            var linePoints, stopPoints, arPoints, lineL, lineR, stopL, stopR, arL, arR;
            var midY = stopTop - txt.height / 2;

            if (txt.width < (sideLength - gap * 2 - arW * 3)) {
                txt.position = [sideLength / 2 - txt.width / 2, stopTop];
                linePoints = [[0, midY], [sideLength / 2 - txt.width / 2 - gap / 2, midY]];
                lineL = _addLine(linePoints);
                lineR = lineL.duplicate();
                lineR.translate(lineL.width + txt.width + gap);

                stopPoints = [[0, stopBot], [0, stopTop]];
                stopL = _addLine(stopPoints);
                stopR = stopL.duplicate();
                stopR.translate(sideLength);

                arPoints = [[arW, midY - arH / 2], [0, midY], [arW, midY + arH / 2]];
                arL = _addArrow(arPoints);
                arR = arL.duplicate();
                arR.rotate(180);
                arR.translate(sideLength - arW);

            } else {
                stopPoints = [[0, stopBot], [0, stopTop]];
                stopL = _addLine(stopPoints);
                stopR = stopL.duplicate();
                stopR.translate(sideLength);

                if (txt.width < sideLength - arW) {
                    txt.position = [sideLength / 2 - txt.width / 2, stopTop];
                    lineL = _addLine([[-arW * 2, midY], [sideLength / 2 - txt.width / 2 - gap / 2, midY]]);
                    lineR = _addLine([[sideLength / 2 + txt.width / 2 + gap / 2, midY], [sideLength + arW * 2, midY]]);
                } else {
                    txt.position = [sideLength + arW * 2 + gap, stopTop];
                    // Continuous dimension line between extension lines plus outside tails
                    _addLine([[-arW * 2, midY], [sideLength + arW * 2, midY]]);
                }

                arPoints = [[arW, midY - arH / 2], [0, midY], [arW, midY + arH / 2]];
                arL = _addArrow(arPoints);
                arR = arL.duplicate();
                arR.translate(sideLength);
                arL.rotate(180, true, true, true, true, Transformation.LEFT);
            }
            return meas;
        }

        // --- Execution Branches ---
        if (measType === 'linear' || measType === 'gap_h' || measType === 'gap_v') {
            var activeSide = side;
            if (measType === 'gap_h' && !activeSide) activeSide = 'top';
            if (measType === 'gap_v' && !activeSide) activeSide = 'left';

            switch (activeSide) {
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
            var isLeft = (side === 'tl' || side === 'bl' || side === 'left');
            var isBottom = (side === 'br' || side === 'bl' || side === 'bott');

            var cx = left + elW / 2;
            var cy = top - elH / 2;
            var offset = (elW / 2) / Math.sqrt(2);

            var xr = isLeft ? (cx - offset) : (cx + offset);
            var yr = isBottom ? (cy - offset) : (cy + offset);
            var shelfYr = isBottom ? (yr - stopTop) : (yr + stopTop);
            var shelfEndXr = isLeft ? (xr - stopTop * 2) : (xr + stopTop * 2);

            _addLine([[0, 0], [elW / 2, 0]]);
            if (elW / 2 > (arW + strkW)) {
                var ar0r = _addArrow([[arW, arH / 2], [0, 0], [arW, -arH / 2]]);
                ar0r.rotate(180);
                ar0r.translate(elW / 2 - arW);
                meas.position = [cx, cy + arH / 2];
            } else {
                meas.position = [cx, cy];
            }

            var rotAngle = 45;
            if (isLeft && !isBottom) rotAngle = 135;
            else if (isLeft && isBottom) rotAngle = -135;
            else if (!isLeft && isBottom) rotAngle = -45;

            meas.rotate(rotAngle, true, false, false, false, Transformation.LEFT);

            _addLine([[xr, yr], [isLeft ? xr - stopTop : xr + stopTop, shelfYr], [shelfEndXr, shelfYr]]);
            txt = meas.textFrames.add();
            txt = _addLabel('R ' + lablR + units);
            if (isLeft) {
                txt.position = [shelfEndXr - gap - txt.width, shelfYr + txt.height / 2];
            } else {
                txt.position = [shelfEndXr + gap, shelfYr + txt.height / 2];
            }

        } else if (measType === 'diam') {
            if (!isCircle(selection[iterator])) {
                meas.remove();
                return;
            }
            var isLeft = (side === 'tl' || side === 'bl' || side === 'left');
            var isBottom = (side === 'br' || side === 'bl' || side === 'bott');

            var cx = left + elW / 2;
            var cy = top - elH / 2;
            var offset = (elW / 2) / Math.sqrt(2);

            var xd = isLeft ? (cx - offset) : (cx + offset);
            var yd = isBottom ? (cy - offset) : (cy + offset);
            var shelfYd = isBottom ? (yd - stopTop) : (yd + stopTop);
            var shelfEndXd = isLeft ? (xd - stopTop * 2) : (xd + stopTop * 2);

            _addLine([[0, 0], [elW, 0]]);
            if (elW > (arW + strkW) * 2) {
                var ar0d = _addArrow([[arW, arH / 2], [0, 0], [arW, -arH / 2]]);
                var ar1d = ar0d.duplicate();
                ar1d.rotate(180);
                ar1d.translate(elW - arW);
                meas.position = [left, cy + arH / 2];
            } else {
                meas.position = [left, cy];
            }

            var rotAngle = 45;
            if (isLeft && !isBottom) rotAngle = 135;
            else if (isLeft && isBottom) rotAngle = -135;
            else if (!isLeft && isBottom) rotAngle = -45;

            meas.rotate(rotAngle);

            _addLine([[xd, yd], [isLeft ? xd - stopTop : xd + stopTop, shelfYd], [shelfEndXd, shelfYd]]);
            txt = meas.textFrames.add();
            txt = _addLabel('\u00d8 ' + lablW + units);
            if (isLeft) {
                txt.position = [shelfEndXd - gap - txt.width, shelfYd + txt.height / 2];
            } else {
                txt.position = [shelfEndXd + gap, shelfYd + txt.height / 2];
            }

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
            if (!app.documents.length) return JSON.stringify([]);
            var sel = app.activeDocument.selection;
            if (!sel || !sel.length) return JSON.stringify([]);

            var res = [];

            // Dedicated Gap modes (gap_h, gap_v) or Ctrl+Click on 2 objects
            if ((u.measType === 'gap_h' || u.measType === 'gap_v') || (sel.length === 2 && u.ctrl === true)) {
                if (sel.length >= 2) {
                    var singleName = executeMeasure(u, -1);
                    if (singleName) res.push(singleName);
                    return JSON.stringify(res);
                }
            }

            // Normal per-object measurement (1 or more selected objects)
            for (var i = 0; i < sel.length; i++) {
                if ((sel[i].name || '').match(/^\d{7}$/)) continue;
                var measName = executeMeasure(u, i);
                if (measName) {
                    res.push(measName);
                }
            }
            return JSON.stringify(res);
        },

        deleteByName: function(name) {
            if (!name || !app.documents.length) return false;
            try {
                var el = app.activeDocument.groupItems.getByName(name);
                if (el) {
                    el.remove();
                    return true;
                }
            } catch (e) {
                return false;
            }
            return false;
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
        },

        getAllFonts: function() {
            var lines = [];
            try {
                var fontCollection = (typeof app !== 'undefined' && app.textFonts) ? app.textFonts : (typeof textFonts !== 'undefined' ? textFonts : null);
                if (fontCollection) {
                    var len = fontCollection.length;
                    for (var i = 0; i < len; i++) {
                        try {
                            var f = fontCollection[i];
                            var postscriptName = '';
                            var familyName = '';
                            var styleName = '';
                            try { postscriptName = f.name || ''; } catch(e1) {}
                            try { familyName = f.family || postscriptName; } catch(e2) { familyName = postscriptName; }
                            try { styleName = f.style || ''; } catch(e3) {}
                            if (postscriptName) {
                                lines.push(postscriptName + '@@' + familyName + '@@' + styleName);
                            }
                        } catch(eItem) {}
                    }
                }
            } catch (eAll) {}
            return lines.join('\n');
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

function getAllInstalledFonts() {
    return AIMeasurment.getAllFonts();
}
