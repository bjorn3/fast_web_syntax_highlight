// @flow
//jshint esnext:true
//jshint browser:true

let output = document.querySelector("#output");
let highlighted = document.querySelector("#highlighted");
let editor = document.querySelector("#editor");

if(!output || !highlighted || !editor) {
    throw "Error";
}

window.onerror = function log_error(e /*: Error*/) {
    output.textContent += "\n" + e.toString() + "\nstack:\n" + e.stack + "\n";
};

let punctuations /*: Array<string>*/ = window.punctuations.sort( (a /*: string*/, b /*: string */) => a.length < b.length );

class Token{
    /*::type: string;*/
    /*::chars: string*/

    static done() {
        return new Token("done", "");
    }

    constructor(type /*: string*/, chars /*: string*/){
        this.type = type;
        this.chars = chars;
    }

    to_html(){
        let spellcheck = this.type == "comment" && this.chars.startsWith("//") ? "spellcheck='true'" : "";
        let content = this.chars.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, " <br>");
        return `<span class='${this.type}' ${spellcheck}>${content}</span>`;
    }

    is_done() {
        return this.type == "done";
    }
}

class Tokenizer{
    /*::source: string*/

    static tokenize(source /*: string*/){
        let tokenizer = new Tokenizer(source);
        let tokens = [];
    
        while(true){
            let token = tokenizer.next_token();
            if(token.is_done()){
                break;
            }
            tokens.push(token);
        }
    
        //log_tokens(tokens);
        return tokens;
    }

    constructor(source){
        this.source = source;
    }

    skip(cnt){
        this.source = this.source.slice(cnt);
    }

    cur_chr() {
        return this.source[0];
    }

    chr_at(index /*: number*/) {
        return this.source[index];
    }

    is_eof() {
        return this.source.length === 0;
    }

    starts_with(str /*: string | RegExp */) {
        if(str instanceof RegExp) {
            let match = this.source.match(str);
            if(!match || match.index != 0) {
                return false;
            } else {
                return true;
            }
        } else {
            return this.source.startsWith(str);
        }
    }

    match_regexp(type, regexp) {
        let match = this.source.match(regexp);
        if(!match || match.index != 0) {
            return;
        }
        this.skip(match[0].length);
        return new Token(type, match[0]);
    }

    next_token() /*: Token*/{
        let token;
        if(this.is_eof()){
            return Token.done();
        }else if(token = this.match_whitespace()){
            return token;
        }else if(token = this.match_number()){
            return token;
        }else if(token = this.match_string()){
            return token;
        }else if(token = this.match_comment()){
            return token;
        }else if(token = this.match_keyword()){
            return token;
        }else if(token = this.match_punctuation()){
            return token;
        }else if(token = this.match_macro_invocation()){
            return token;
        }else{
            let chars = [];
            while(!this.is_punctuation() && !this.is_comment() && !this.is_whitespace(this.cur_chr()) && !this.is_eof()){
                chars.push(this.cur_chr());
                this.skip(1);
            }
            if(chars.length === 0) {
                throw "No tokens matched";
            }
            return new Token("identifier", chars.join(""));
        }
    }

    is_whitespace(char){
        return char == " " || char == "\n";
    }

    match_whitespace(){
        return this.match_regexp("whitespace", /\s+/);
    }

    is_comment(){
        return this.starts_with("//") || this.starts_with("/*");
    }

    match_comment(){
        return this.match_regexp("comment", /(\/\/[^\n]*\n)|(\/\*[^\*]*\*\/)/);
    }

    is_punctuation(){
        for(let punctuation of punctuations){
            if(this.starts_with(punctuation)){
                return true;
            }
        }
        return false;
    }

    match_punctuation(){
        for(let punctuation /*: string*/ of punctuations){
            if(this.starts_with(punctuation)){
                this.skip(punctuation.length);
                return new Token("punctuation", punctuation);
            }
        }
    }

    match_macro_invocation(){
        return this.match_regexp("macro", /\w+\!/);
    }

    match_string(){
        if(this.starts_with("\"")){
            this.skip(1);
            let chars = ["\""];
            while(!this.starts_with("\"") && !this.is_eof()){
                if(this.starts_with("\\\"")){
                    chars.push("\\");
                    chars.push("\"");
                    this.skip(2);
                    continue;
                }
                chars.push(this.cur_chr());
                this.skip(1);
            }
            chars.push(this.cur_chr());
            this.skip(1);
            return new Token("string", chars.join(""));
        }
    }

    match_number(){
        return this.match_regexp("number", /\.?[\d]+|[\d]+\.[\d]*/);
    }

    match_keyword(){
        for(let keyword /*: string */ of window.keywords){
            if(this.starts_with(keyword) && this.is_whitespace(this.chr_at(keyword.length)) ){
                this.skip(keyword.length);
                return new Token("keyword", keyword);
            }
        }
    }
}

function log_tokens(tokens /*: Array<Token>*/) {
    output.textContent = "";
    for(let token of tokens) {
        if(token.is_done()){
            output.textContent += "Done\n";
            return;
        }
        let type = token.type;
        type = type.replace("punctuation", "punct").replace("identifier", "ident");
        while(type.length < 10){
            type += " ";
        }
        if(token.chars != " " && token.chars != "\n"){
            output.textContent += type + JSON.stringify(token.chars).replace(/\\"/g, "\"").replace(/\"/g, "") + "\n";
        }
    }
}

function highlight(){
    let source = editor.textContent.replace("&nbsp;", " ");
    highlighted.innerHTML = Tokenizer.tokenize(source)
        .map((token) => {
            return token.to_html();
        })
        .join("");
}

editor.addEventListener("input", function(){
    window.setTimeout(function() {
        highlight();
    }, 0);
});

highlight();
