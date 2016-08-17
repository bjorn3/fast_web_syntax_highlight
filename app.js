//jshint esnext:true
//jshint browser:true

let source = `#!/fnusr/bin/rustc
extern crate rustc_serialize;
extern crate byte_stream_splitter;
#[macro_use]
extern crate lazy_static;

use data::DATAMGR;

pub use rustc_serialize::json::as_json;
use rustc_serialize::json::Json;

///Error
pub mod error;
///Packet
pub mod packet;
///Data
pub mod data;
///Data reader
pub mod gbd;
///Goodgame empire connection
pub mod connection;

///Read castles
pub fn read_castles(data: gbd::Gbd){
    for ain in data.ain{
        for castle in ain.ap{
            DATAMGR.lock().unwrap().add_castle(castle);
        }
        for castle in ain.vp{
            DATAMGR.lock().unwrap().add_castle(castle);
        }
    }
}

pub fn read_names(data: String){
    let data = data.trim_right_matches('%');
    let data = Json::from_str(data).unwrap();
    let data = data.as_object().unwrap();
    let gcl = data.get("gcl").unwrap().as_object().unwrap(); // gcl
    println!("gcl: {:?}\n", gcl);
    let c = gcl.get("C").unwrap().as_array().unwrap(); // gcl C
    println!("C: {:?}", c);
    for world in c.iter(){
        let world = world.as_object().unwrap();
        let world_name = world.get("KID").unwrap().as_u64().unwrap(); // gcl C [] KID
        let world_name = data::World::from_int(world_name);
        println!("world: {:?}", world_name);
        let world = world.get("AI").unwrap().as_array().unwrap(); // gcl C [] AI
        for castle in world{
            let castle = castle.as_object().unwrap().get("AI").unwrap().as_array().unwrap(); // gcl C [] AI [] AI (castle)
            println!("castle: {:?}", castle);
            let castle_id = castle[3].as_u64().unwrap(); // gcl C [] AI [] AI [3] (id)
            let castle_name = castle[10].as_string().unwrap(); // gcl C [] AI [] AI [10] (name)
            let castle = data::Castle{
                id: castle_id,
                owner_id: None,
                name: Some(castle_name.to_string()),
                x: None,
                y: None,
                world: None
            };
            println!("castle: {:?}\n", castle);
            DATAMGR.lock().unwrap().add_castle(castle);
        }
    }
}`;

let output = document.querySelector("#output");
let highlighted = document.querySelector("#highlighted");
let editor = document.querySelector("#editor");

editor.textContent = source;

class Token{
    constructor(type, chars){
        this.type = type;
        this.chars = chars;
        this.done = false;
    }

    log(){
        if(this.done){
            return;
        }
        let type = this.type;
        type = type.replace("punctuation", "punct").replace("identifier", "ident");
        while(type.length < 10){
            type += " ";
        }
        if(this.chars != " " && this.chars != "\n"){
           output.textContent += type + JSON.stringify(this.chars).replace(/\\"/g, "\"").replace(/\"/g, "") + "\n";
        }
    }

    to_html(){
        if(this.type == "space" && this.chars == "\n"){
            return "<br>";
        }else if(this.type == "comment" && this.chars.startsWith("//")){
            return "<span class='" + this.type +"' spellcheck='true'>" + this.chars.replace(/\n/g, " <br>") + "</span>";
        }else{
            return "<span class='" + this.type +"'>" + this.chars.replace(/\n/g, " <br>") + "</span>";
        }
    }
}

Token.done = function(){
    let token = new Token();
    token.done = true;
    return token;
};

class Tokenizer{
    constructor(source){
        this.line = 0;
        this.column = 0;
        this.source = source;
        this.state = "begin";
    }
    next_token(){
        let token;
        if(this.source[0] === undefined){
            return Token.done();
        }else if(token = this.match_whitespace()){
            return token;
        }else if(token = this.match_string()){
            return token;
        }else if(token = this.match_comment()){
            return token;
        }else if(token = this.match_keyword()){
            return token;
        }else if(token = this.match_punctuation()){
            return token;
        }else if(token = this.match_number()){
            return token;
        }else if(token = this.match_macro_invocation()){
                return token;
        }else{
            let chars = [];
            while(!this.is_punctuation() && !this.is_comment() && !this.is_whitespace(this.source[0]) && this.source.length !== 0){
                chars.push(this.source[0]);
                this.skip(1);
            }
            return new Token("identifier", chars.join(""));
        }
    }

    is_whitespace(char){
        return char == " " || char == "\n";
    }

    match_whitespace(){
        if(this.source[0] == " "){
            this.skip(1);
            return new Token("whitespace", " ");
        }else if(this.source[0] == "\n"){
            this.skip(1);
            return new Token("whitespace", "\n");
        }
    }

    skip(cnt){
        this.source = this.source.slice(cnt);
    }

    is_comment(){
        return this.source.startsWith("//") || this.source.startsWith("/*");
    }

    is_punctuation(){
        for(let punctuation of window.punctuations.sort(function(a,b){
            return a.length < b.length;
        })){
            if(this.source.startsWith(punctuation)){
                return true;
            }
        }
        return false;
    }

    is_number(){
        return this.source.startsWith(/\d+/);
    }

    match_macro_invocation(){
        let macro_regex = /^\w+\!/;
        if(macro_regex.test(this.source)){
            let chars = [];
            while(this.source[0] != "!"){
                chars.push(this.source[0]);
                this.skip(1);
            }
            chars.push("!");
            this.skip(1);
            return new Token("macro", chars.join(""));
        }
    }

    match_string(){
        if(this.source.startsWith("\"")){
            this.skip(1);
            let chars = ["\""];
            while(!this.source.startsWith("\"") && this.source.length !== 0){
                if(this.source.startsWith("\\\"")){
                    chars.push("\\");
                    chars.push("\"");
                    this.skip(2);
                    continue;
                }
                chars.push(this.source[0]);
                this.skip(1);
            }
            chars.push(this.source[0]);
            this.skip(1);
            return new Token("string", chars.join(""));
        }
    }

    match_comment(){
        if(this.source.startsWith("//")){
            this.skip(2);
            let chars = ["/", "/"];
            while(this.source[0] != "\n"){
                chars.push(this.source[0]);
                this.skip(1);
            }
            return new Token("comment", chars.join(""));
        }else if(this.source.startsWith("/*")){
            this.skip(2);
            let chars = ["/", "*"];
            while(!this.source.startsWith("*/") && this.source.length !== 0){
                chars.push(this.source[0]);
                this.skip(1);
            }
            chars.push("*");
            chars.push("/");
            this.skip(2);
            return new Token("comment", chars.join(""));
        }
    }

    match_punctuation(){
        for(let punctuation of window.punctuations.sort( (a,b)=>a.length < b.length ) ){
            if(this.source.startsWith(punctuation)){
                this.skip(punctuation.length);
                return new Token("punctuation", punctuation);
            }
        }
    }

    match_number(){
        let num = [];
        while(this.source[0].match(/[\d\\.]/) && !this.is_punctuation() && this.source.length !== 0){
            num.push(this.source[0]);
            this.skip(1);
        }
        if(num.length !== 0){
            return new Token("number", num.join(""));
        }
    }

    match_keyword(){
        for(let keyword of window.keywords){
            if(this.source.startsWith(keyword) && this.is_whitespace(this.source[keyword.length]) ){
                this.skip(keyword.length);
                return new Token("keyword", keyword);
            }
        }
    }
}

function highlight(){
    try{
        let tokens = tokenize(source);

        output.textContent = "";
        tokens.map((token) => token.log());

        let html = tokens2html(tokens);

        highlighted.innerHTML = html;
        output.textContent += "Done";
    }catch(e){
        output.textContent += "\n";
        output.textContent += e + "\n";
        output.textContent += "stack:\n";
        output.textContent += e.stack || "" + "\n";
        throw e;
    }
}

editor.onpaste = editor.onkeypress = function(evt){
    setTimeout(function(){
        source = editor.innerHTML.replace(/<br>/g, "\n");

        if(evt.keyCode >= 37 && evt.keyCode <= 40 || evt.ctrlKey || evt.altKey || evt.metaKey){
            return;
        }

        highlight();
    }, 0);
};

highlight();

function tokenize(source){
    let tokenizer = new Tokenizer(source);
    let token = new Token();
    let tokens = [];
    while(true){
        token = tokenizer.next_token();
        if(token.done){
            break;
        }
        tokens.push(token);
    }
    return tokens;
}

function tokens2html(tokens){
    return tokens
        .map((token) => {
            return token.to_html();
        })
        .join("");
}

function reprint(){
    editor.textContent = tokenize(editor.innerHTML.replace(/<br>/g, "\n")).map((token) => token.chars ).join("");
}
