var fs = require("fs"),
    queue = require("queue-async"),
    _ = require("underscore"),
    cases = require("./cases.json");

cases = shuffle(cases);

cases = cases.forEach(function(c){

  var raw = require("./json/" + c.caseNumber + ".json");

  fs.writeFileSync("txt/" + c.caseNumber + ".txt",clean(raw,c).join("\n"));

});

function clean(pages,details) {

  console.log(details.filename);

  // remove index pages at the end
  for (var i = 0; i < pages.length; i++) {
    if (numColons(pages[i]) > 50) {
      pages = pages.slice(0,i);
      break;
    }
  }

  var coverPageFound,
      contentsPageFound;

  // remove cover pages
  for (var i = Math.min(2,pages.length-1); i >= 0; i--) {
    if (isCoverPage(pages[i])) {
      pages = pages.slice(i+1);
      coverPageFound = true;
      break;
    }
  }

  // remove table of contents
  for (var i = Math.min(3,pages.length-1); i >= 0; i--) {
    if (isContentsPage(pages[i])) {
      pages = pages.slice(i+1);
      contentsPageFound = true;
      break;
    }
  }

  // remove certification pages
  pages = pages.filter(function(page,i){

    return !isCertificationPage(page);

  });

  // Remove the proceedings header and stray page numbers and timestamps and "Official"
  pages = pages.map(function(page,i){

    page = page.filter(function(line){
      if (line.match(/^\s*[0-9]*\s*P\s*R\s*O\s*C\s*E\s*E\s*D\s*I\s*N\s*G\s*S\s*$/)) {
        return false;
      }

      if (line.match(/^\s*[0-9]+\s*$/)) {
        return false;
      }

      return true;
    });

    //
    if (page[0].match(/^\s*Official\s*$/)) {
      page.shift();
    } else if (page[0].match(/^\s*Official/) && page[0].match(/subject/i) && page[0].match(/review/i)) {
      page.shift();
    }

    // Remove timestamp
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

  return flattened;

}

function removeAlderson(lines) {

  for (var i = 0; i < lines.length; i++) {
    if (lines[i].match(/alderson\s+reporting/i)) {
      return lines.slice(0,i);
    }
  }

  return lines;

}

function removeLineNumbers(lines) {

  return lines.map(function(line){

    return line.replace(/^\s*[0-9]{1,2}(?=\s+)/,"");

  });

}

function removeSubmitted(lines) {
  for (var i = lines.length-1; i >= 0; i--) {
    if (lines[i].match(/[(]whereupon/i)) {
      return lines.slice(0,i);
    }
  }

  console.log(lines);
}

function isCertificationPage(page) {

  var isCertification = page[0].trim().match(/certification/i) && page[page.length-1].trim().match(/reporter/i);

  return isCertification;

}

function isContentsPage(page) {

  var contents = !!page.slice(0,5).filter(function(line){
    return line.replace(/[^a-z]/ig,"") === "CONTENTS";
  }).length;

  if (contents) {
    return true;
  }

  return false;

}

function isCoverPage(page) {

  var header = !!page.filter(function(line){
    return line.replace(/[^a-z]/ig,"") === "INTHESUPREMECOURTOFTHEUNITEDSTATES";
  }).length;

  var v = page.join("").match(/\sv[.]\s/);
  var no = page.join("").match(/no[.]\s/i);

  if (header && v && no) {
    return true;
  }

  return false;

}

function numColons(page) {

  return (page.join("").match(/[:]/g) || []).length;

}

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