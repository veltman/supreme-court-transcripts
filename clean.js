var fs = require("fs"),
    _ = require("underscore"),
    cases = shuffle(require("./cases.json")); // Randomize for better spot checking

// Get each raw case text and structure it
cases = cases.forEach(function(details){

  var raw = require("./json/" + details.caseNumber + ".json");

  // Write the final version out to JSON
  fs.writeFileSync("final/" + details.caseNumber + ".json",JSON.stringify(clean(raw,details)));

});

// Clean everything up
function clean(pages,details) {

  // Look for the first index page, lop off everything after it
  for (var i = 0; i < pages.length; i++) {
    if (isIndexPage(pages[i])) {
      pages = pages.slice(0,i);
      break;
    }
  }

  // Look for the last cover page, lop off everything before it
  for (var i = Math.min(2,pages.length-1); i >= 0; i--) {
    if (isCoverPage(pages[i])) {
      pages = pages.slice(i+1);
      break;
    }
  }

  // Look for the first table of contents page, lop off everything before it
  for (var i = Math.min(3,pages.length-1); i >= 0; i--) {
    if (isContentsPage(pages[i])) {
      pages = pages.slice(i+1);
      break;
    }
  }

  // Remove certification pages
  pages = pages.filter(function(page,i){

    return !isCertificationPage(page);

  });

  // Remove some junk:
  // "PROCEEDINGS" header
  // Stray page numbers
  // Timestamp at the beginning of the transcript
  // "OFFICIAL" header
  pages = pages.map(function(page,i){

    page = page.filter(function(line){
      if (line.match(/^\s*[0-9]*\s*P\s*R\s*O\s*C\s*E\s*E\s*D\s*I\s*N\s*G\s*S\s*[.]?$/)) {
        return false;
      }

      if (line.match(/^\s*[0-9]+\s*$/)) {
        return false;
      }

      return true;
    });

    if (page[0].match(/^\s*Official\s*$/)) {
      page.shift();
    } else if (page[0].match(/^\s*Official/) && page[0].match(/subject/i) && page[0].match(/review/i)) {
      page.shift();
    }

    if (i === 0 && page[0].match(/[0-9]+[:][0-9]{2}\s*(a|p)[.]?m[.]?/)) {
      page.shift();
    }

    page = removeAlderson(page);

    return page;

  });

  // Remove line numbers
  pages = pages.map(removeLineNumbers);

  var flattened = _.flatten(pages);

  // Remove other boilerplate from last page
  flattened = removeSubmitted(flattened);

  // Remove any new empty lines - probably don't need this
  flattened = flattened.filter(function(line){
    return line.replace(/\s/g,"").length;
  });

  return getSpeakers(flattened);

}

// Turn a list of cleaned lines into an array of lines of speech by speaker
function getSpeakers(flattened) {

  var lines = [],
      currentSpeaker = null,
      buffer = [];

  for (var i = 0; i < flattened.length; i++) {

    var speaker = getSpeaker(flattened[i]),
        isLaughter = flattened[i].match(/[(]laughter[.][)]/i);

    // Flush the buffer to lines
    if (isLaughter || speaker) {

      if (buffer.length) {

        lines.push({
          speaker: currentSpeaker,
          text: buffer.join(" ").replace(/\s+/g," ")
        });

      }

      currentSpeaker = speaker || null;
      buffer = [];

    }

    // If it's a REBUTTAL ARGUMENT, ORAL ARGUMENT header we don't want it
    if (!speaker && flattened[i].match(/^\s+[A-Z]+[^a-z]+[A-Z,]\s*$/)) {

      continue;

    } else if (speaker) {

      // Add text minus speaker
      buffer.push(flattened[i].split(":").slice(1).join(":").trim());

    } else {

      //Add all text
      buffer.push(flattened[i].trim());

    }

  }

  // Flush anything left in the buffer to lines
  if (buffer.length) {
    lines.push({
      speaker: currentSpeaker,
      text: buffer.join(" ").replace(/\s+/g," ")
    });
  }

  return lines;

}

// Get the speaker of the line
// (multiple all caps words followed by a colon to start the line)
function getSpeaker(line) {

  var match = line.match(/^(\s+[A-Z][A-Z-]+[.]?){1,4}[:]/);

  if (match) {
    return match[0].replace(":","").replace(/\s+/g," ").replace("CHIEF JUSTICE","JUSTICE").trim();
  }

  return null;

}

// Remove the Alderson Reporting Company's footer
function removeAlderson(lines) {

  // Look for a line about Alderson Reporting Company
  // lop it off and everything after it
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].match(/alderson\s+reporting/i)) {
      return lines.slice(0,i);
    }
  }

  return lines;

}

// Remove line numbers, these are pretty erratic
function removeLineNumbers(lines) {

  return lines.map(function(line){

    return line.replace(/^\s*[0-9]{1,2}(?=\s+)/,"");

  });

}

// Remove the final parenthetical about the case being submitted
function removeSubmitted(lines) {
  for (var i = lines.length-1; i >= 0; i--) {
    if (lines[i].match(/[(]whereupon/i)) {
      return lines.slice(0,i);
    }
  }

  console.log(lines);
}

// It's a certification page if the first line says "certification" and the last line says "reporter"
function isCertificationPage(page) {

  return page[0].trim().match(/certification/i) && page[page.length-1].trim().match(/reporter/i);

}

// Is it a table of contents page?
function isContentsPage(page) {

  // Does it have a line with just the word "CONTENTS" on it near the top?
  return !!page.slice(0,5).filter(function(line){
    return line.replace(/[^a-z]/ig,"") === "CONTENTS";
  }).length;

}

// Is it a cover page?
function isCoverPage(page) {

  // Does it have an "IN THE SUPREME COURT OF THE UNITED STATES" header
  // give or take punctuation and spacing
  var header = !!page.filter(function(line){
    return line.replace(/[^a-z]/ig,"") === "INTHESUPREMECOURTOFTHEUNITEDSTATES";
  }).length;

  // Does it have "v." somewhere
  var v = page.join("").match(/\sv[.]\s/);

  // Does it have the case number abbreviation "no." somewhere
  var no = page.join("").match(/no[.]\s/i);

  // If those three are true, consider it a cover page
  if (header && v && no) {
    return true;
  }

  return false;

}

// It's an index page if it has a crapload of colons in it
function isIndexPage(page) {

  return (page.join("").match(/[:]/g) || []).length > 50;

}

// Fisher-Yates via Mike Bostock
function shuffle(array) {
  var m = array.length, t, i;

  // While there remain elements to shuffle…
  while (m) {

    // Pick a remaining element…
    i = Math.floor(Math.random() * m--);

    // And swap it with the current element.
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }

  return array;
}