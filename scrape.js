var fs = require("fs"),
    queue = require("queue-async"),
    request = require("request"),
    cheerio = require("cheerio"),
    _ = require("underscore");

var years = queue(1);

for (var i = 2010; i <= 2014; i++) {

  years.defer(getYear,i);

}

years.awaitAll(function(err,cases){
  if (err) {
    throw new Error(err);
  }
  
  fs.writeFile("cases.json",JSON.stringify(_.flatten(cases)));
});

function getYear(year,cb) {

  console.log(year);

  request.get("http://www.supremecourt.gov/oral_arguments/argument_transcript/" + year,function(err,res,body){

    if (err) {
      return cb(err);
    }

    getRows(body,cb);

  });

}

function getRows(body,cb) {

  var $ = cheerio.load(body),
      transcripts = queue(1);

  $("#mainbody div.panel.panel-scus table.datatables tr").each(function(){

    var $row = $(this),
        $cells = $row.find("td"),
        $first = $cells.first(),
        $last = $cells.last(),
        $link = $first.find("a"),
        filename,
        caseNumber,
        title,
        date;

    if ($link.length) {

      filename = $link.attr("href").split("/").pop();
      caseNumber = $link.text().trim();

      $row.find("a").remove();

      title = $first.text().trim();
      date = $last.text().trim();

      transcripts.defer(getTranscript,{
        filename: filename,
        caseNumber: caseNumber.replace(/[.]$/,""),
        title: title,
        date: date
      });

    }

  });

  transcripts.awaitAll(function(err,cases){
    cb(err,cases);
  });

}

function getTranscript(details,cb) {

  var file = fs.createWriteStream("raw/" + details.caseNumber + ".pdf");

  file.on("finish",function(){
    return cb(null,details);
  })

  request.get("http://www.supremecourt.gov/oral_arguments/argument_transcripts/" + details.filename)
    .on("error",function(err){
      return cb(err);
    })
    .pipe(file);


}