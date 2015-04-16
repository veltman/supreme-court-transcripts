var fs = require("fs"),
    extract = require("pdf-extract"),
    queue = require("queue-async"),
    path = require("path"),
    cases = require("./cases.json");

var pdfs = queue(1);

cases.forEach(function(c){
  pdfs.defer(convert,c.filename,c.caseNumber);
});

pdfs.awaitAll(function(err){
  if (err) {
    console.warn(err);
  }
});

function convert(filename,caseNumber,cb) {

  var absolute = path.resolve("raw/" + filename),
      json = "json/" + caseNumber + ".json";

  if (fs.existsSync(json)) {
    return cb(null);
  }

  console.log(filename);

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