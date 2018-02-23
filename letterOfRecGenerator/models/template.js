var db = require('../db');

var Schema = db.Schema;

var TemplateSchema = new Schema({
    name: String,
    text: String,
    questions: [{
        number: Number,
        question: String,
        tag: String
    }],
    letterheadImg: {
        data: Buffer,
        contentType: String
    },
    archived: {
        type: Boolean,
        default: false
    }
});

TemplateSchema.methods.archive = function () {
    this.archived = true;
}

var Template = db.model('Template', TemplateSchema);

module.exports = Template;