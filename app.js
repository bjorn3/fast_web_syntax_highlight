//jshint esnext:true
//jshint browser:true

let source = `
fn main(){
    println//bar
!("Hello world"); //hello
    let i = 012345678910111213141516171819202122232425262728293031323334353637383940;/*a
                b*/
    while//world
        i != 10{
            i += 1;
    }
    println!("{}\"", i);
}
`;

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
        while(type.length < 15){
            type += " ";
        }
        if(this.chars != " " && this.chars != "\n"){
           output.textContent += type + this.chars + "\n";
        }
    }

    to_text(){
        if(this.type == "space" && this.chars == "\n"){
            return "<br>";
        }else if(this.type == "comment" && this.chars.startsWith("//")){
            return "<span class='" + this.type +"' spellcheck='true'>" + this.chars + "</span>";
        }else{
            return "<span class='" + this.type +"'>" + this.chars + "</span>";
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
            while(!this.is_punctuation() && !this.is_comment() && this.source.length !== 0){
                chars.push(this.source[0]);
                this.skip(1);
            }
            return new Token("identifier", chars.join(""));
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
        for(let punctuation of window.punctuations){
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
            if(this.source.startsWith(keyword)){
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
        source = editor.textContent;

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
            return token.to_text();
        })
        .join("");
}
