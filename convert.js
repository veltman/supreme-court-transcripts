var fs = require("fs"),
    extract = require("pdf-extract"),
    queue = require("queue-async"),
    path = require("path"),
    cases = require("./cases.json");

var pdfs = queue(1);

// Queue up each PDF for conversion
cases.forEach(function(c){
  pdfs.defer(convert,c.caseNumber);
});

pdfs.awaitAll(function(err){
  if (err) {
    console.warn(err);
  }
});

function convert(caseNumber,cb) {

  var absolute = path.resolve("raw/" + caseNumber + ".pdf"),
      json = "json/" + caseNumber + ".json";

  if (fs.existsSync(json)) {
    return cb(null);
  }

  var processor = extract(absolute,{type:"text"},function(){});

  processor.on("error",function(err){
    return cb(err);
  }).on("complete",function(data){

    var pages = data.text_pages.map(function(page){
      return page.replace(/\f/g,"").split("\n").filter(function(line){
        return line;
      });
    });

    fs.writeFile(json,JSON.stringify(pages),function(err){
      return cb(err);
    })
  });

}