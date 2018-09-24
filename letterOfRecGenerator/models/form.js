var db = require('../db');
var Link = require('./link');
var User = require('./user');
var Template = require('./template');


var Schema = db.Schema;

var FormSchema = new Schema({
    email: String,
    status: {
        type: String,
        enum: ['Sent', 'Submitted', 'Complete']
    },
    template: Template.schema,
    link: Link.schema,
    responses: [{
        tag: String,
        response: Schema.Types.Mixed,
    }],
    meta: {
        sent: Date,
        submitted: Date,
        completed: Date
    },
    letter: String,
    duplicated: Boolean,
    organization: String
});


FormSchema.methods.getResponses = function () {
    // console.log("this form's responses: ");
    // console.log(this.responses);

    // if there are multiple schools, create copies
    return this.responses;
};

/**
 * Creates a new form and initializes values
 * @param email Students email address
 * @param template
 * @param cb
 */
FormSchema.statics.createForm = function (email, template, cb) {
    Link.generateLink(email, function (err, link) {
        if (err) {
            cb(err, null);
        } else {
            Form.create({
                email: email,
                status: 'Sent',
                template: template,
                link: link,
                'meta.sent': Date.now(),
                duplicated: false,
                organization: "unspecified"
            }, cb);
        }
    });
};

/**
 * Duplicated a form and adds organization value
 * @param form - form to be duplicated
 * @param organization - organization that unique to the duplicated form
 * @param cb
 */
FormSchema.statics.duplicateForm = function (form, organization, cb) {
    console.log("IN FORMSCHEMA DUPLICATEFORM");
    Form.create({
        email: form.email,
        status: form.status,
        template: form.template,
        link: form.link,
        responses: form.responses,
        meta: form.meta,
        letter: form.letter,
        duplicated: true,
        organization: organization
    }, cb);
};


FormSchema.statics.findForm = function (id, cb) {
    Form.findOne({_id: id}, cb);
};

FormSchema.statics.findFromLink = function (link, cb) {
    Form.findOne({'link.link': link}, cb);
};

FormSchema.statics.removeForm = function (id, cb) {
    FormSchema.statics.findForm(id, function (err, form) {
        if (err) {
            cb(err, null);
        } else {
            Link.removeLink(form.link.getId(), function (err) {
                if (err) {
                    cb(err, null);
                } else {
                    Form.remove({_id: id}, cb);
                }
            });
        }
    });
};

FormSchema.methods.getLink = function () {
    return this.link.link;
};

FormSchema.methods.getSent = function () {
    return this.meta.sent.toLocaleString('en-US');
};

FormSchema.methods.isSubmitted = function () {
    return this.status == 'Submitted';
};

FormSchema.methods.getSubmitted = function () {
    return this.meta.submitted.toLocaleString('en-US');
};

FormSchema.methods.getTemplate = function () {
    return this.template;
};

/**
 * Setter for organization
 * @param organization
 */
FormSchema.methods.setOrganization = function (organization) {
    this.organization = organization;
    this.save();
};

FormSchema.methods.setDuplicatedTrueAndSave = function() {
    this.duplicated = true;
    this.save();
};

FormSchema.statics.submitForm = function (id, responseData, cb) {
    FormSchema.statics.findForm(id, function (err, form) {
        if (err) {
            cb(err, null);
        } else {
            var responses = [];
            form['template']['questions'].forEach(function (question) {
                var response = responseData[question.number - 1];
                console.log("response: " + response);

                if (!response.length) {
                    responses.push({
                        tag: question.tag,
                        response: ''
                    });
                } else if (!(response instanceof Array)) {
                    responses.push({
                        tag: question.tag,
                        response: response
                    });
                } else {
                    response.forEach(function (optionText) {
                        var option = question.options.find(function (option) {
                            return option.fill === optionText;
                        });

                        responses.push({
                            tag: option.tag,
                            response: option.fill
                        });
                    });
                }
            });

            form.status = 'Submitted';
            form['responses'] = responses;
            form['meta']['submitted'] = Date.now();

            /*
            console.log("----------------------------findForm (new form created) : ----------------------");
            console.log(form);

            for (let j = 0; j < responses.length; j++) {
                let tag = responses[j].tag;
                // console.log(tag);
                if (tag === '<!ORG>') {
                    let organizationsList = responses[j].response.trim();
                    let organizationsArr = organizationsList.split(", ");
                    console.log("LENGTH OF ORGS: " + organizationsArr.length);
                    console.log("list: " + organizationsList);
                    let numOrganizations = organizationsArr.length;
                    //let formToDuplicate = forms[i];
                    console.log("numOrganizations: " + numOrganizations);

                    if(numOrganizations > 1) {
                        // duplicate numOrganizations - 1 times
                        for(let k=0; k<5; k++) {
                            Form.duplicateForm(form, function (err, form) {
                                console.log("Duplicated success: " + k);
                                if (err) {
                                    console.log("error in Form.duplicateForm");
                                } else {
                                    // add this form to user
                                    // User.addForm(form);

                                    User.addForm(form, function (err) {
                                        if (err) {
                                            console.log(`error: ${err}`);
                                            return;
                                        }
                                    });


                                }
                            });
                        }
                    }
                }
            }
            */


            form.save(function (err) {
                cb(err, form);
            });
        }
    });
};

FormSchema.statics.completeForm = function (id, letter, cb) {
    FormSchema.statics.findForm(id, function (err, form) {
        if (err) {
            cb(err, null);
        } else {
            form.letter = letter;
            form.status = 'Complete';

            if (!form['meta']['completed']) {
                form['meta']['completed'] = Date.now();
            }

            form.save(function (err) {
                cb(err, form);
            });
        }
    });
};


var Form = db.model('Form', FormSchema);

module.exports = Form;