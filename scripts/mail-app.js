'use strict';

var app = angular.module("mailApp", ["ngMessages", "ui.router"]);

app.config(function ($stateProvider, $urlRouterProvider) {
    $urlRouterProvider
        .when("/mail", ['$state', function ($state) {
            $state.go("mailList", {folderName: 'Inbox'});
        }])
        .otherwise("mail");

    $stateProvider
        .state("mail", {
            url: "/mail",
            template: "<mail-page></mail-page>"
        })
        .state("mailList", {
            parent: "mail",
            url: "/folder?folderName",
            template: "<mail-list folder-name='$ctrl.folderName'></mail-list>",
            controller: function ($stateParams) {
                this.folderName = $stateParams.folderName;
                console.log("mailList for"+this.folderName);
                //MailService.selectedFolder = this.folderName;
            },
            controllerAs: "$ctrl"
        })
        .state("mailView", {
            parent: "mailList",
            url: "/mail?mailId",
            template: "<mail-view mail-id='$ctrl.mailId'></mail-view>",
            controller: function ($stateParams) {
                this.mailId = $stateParams.mailId;
            },
            onExit: function(MailService){
                MailService.selectedMail = null;
                console.log("exit mailView");
            },
            controllerAs: "$ctrl"
        })
        .state("newMail", {
            parent: "mail",
            url: "/newMail",
            template: "<mail-view></mail-view>"
        })
        .state("contacts", {
            url: "/contacts",
            template: "<contact-page></contact-page>"
        })
        .state("contactView", {
            parent: "contacts",
            url: "/contact?contactId",
            template: "<contact-view contact-id='$ctrl.contactId'></contact-view>",
            controller: function ($stateParams) {
                this.contactId = $stateParams.contactId;
            },
            controllerAs: "$ctrl"
        })
        .state("newContact", {
            parent: "contacts",
            url: "/newContact",
            template: "<contact-view></contact-view>"
        });
});

app.component("mailApp",
    {
        templateUrl: 'components/mail-app.html',
        controller: function () {
            this.pageList = [{
                title: "Mails",
                state: "mail"
            }, {
                title: "Contacts",
                state: "contacts"
            }];
        }
    }
);

app.component("mailPage",
    {
        templateUrl: 'components/mail-page.html',
        controller: function (MailService) {
            this.folders = null;

            this.isMailSelected = () => {
                return MailService.selectedMail !== null;
            };
        }
    }
);

app.component("folders",
    {
        bindings: {
            folders: "="
        },
        templateUrl: 'components/folders/folder-list.html',
        controller: function (MailService) {
            MailService.getFolders().then((folders) => {
                this.folders = folders;
                if (!MailService.selectedFolder) this.setSelectedFolder(this.folders[0].name);
            });

            /*this.setSelectedFolder = (folderName) => {
                MailService.selectedFolder = folderName;
                MailService.selectedMail = null;
            }*/

        }
    }
);

app.component("folder",
    {
        bindings: {
            folder: "="

        },
        templateUrl: 'components/folders/folder-item.html',
        controller: function () {
            this.iconClass = this.folder.name.toLowerCase().slice(0, 3);
        }
    }
);

class ListController {
    constructor(service, $timeout) {
        this.service = service;
        this.setSelectedItem(null);
        $timeout(()=>
            this.loadItems()
        );
    }

    loadItems() {
        return this.items;
    }

    setSelectedItem(item) {
        this.service.selectedItem = item;
    }

    add() {
        this.service.selectedItem = {};
    }

    remove(dataName) {
        let delItems = [];
        let updatedItems = [];
        this.items.forEach((item)=> {
            if (item.checked) {
                delItems.push(item);
            } else {
                updatedItems.push(item);
            }
        });
        if (delItems.length > 0) {
            this.service.removeArray(delItems, dataName)
                .then((response) => {
                    if (response === true) this.items = updatedItems;
                })
                .catch(error => this.getItems());
        } else {
            alert("Please, choose items to delete.");
        }
    }
}

app.component("mailList",
    {
        bindings: {
            folderName: "<"
        },
        templateUrl: 'components/mails/mail-list.html',
        controller: class MailListController extends ListController {
            constructor(MailService,$timeout) {
                super(MailService,$timeout);
                $timeout(()=>
                    this.service.selectedFolder = this.folderName
                );
            }

            loadMails() {
                this.service.getMails(this.folderName)
                    .then((mails)=> {
                        this.mails = mails;
                    });
            }

            loadItems() {
                return this.loadMails();
            }

            get mails() {
                return this.items;
            }

            set mails(items) {
                this.items = items;
            }

            isMailSelected(){
                return this.service.selectedItem !== null;
            }

        }
    }
);

app.component("mailListItem",
    {
        bindings: {
            mail: "<"
        },
        templateUrl: 'components/mails/mail-list-item.html',
        controller: function ($filter) {
            this.date = $filter('date')(new Date(this.mail.date), "MMM d");
        }
    }
);

class ViewController {
    constructor(service,$state) {
        this.service = service;
        this.state = $state;
        this.item = service.selectedItem;
    }

    remove(dataName) {
        this.service.remove(this.item, dataName).then((response)=> {
            this.service.selectedItem = null;
            this.goToListState();
        });
    }

    getSelectedItem(folderName, itemId) {
        if (itemId) {
            this.service.getSelectedItem(folderName, itemId)
                .then((response) => {
                        this.item = response;
                        this.service.selectedItem = this.item;
                    }
                ).catch(error => console.log(error.message));
        }else{
            this.item = this.service.selectedItem = {};
        }
    }
}

app.component("mailView",
    {
        bindings: {
            mailId:"<"
        },
        templateUrl: 'components/mails/mail-view.html',
        controller: class MailViewController extends ViewController {
            constructor(MailService,$state, $timeout) {
                super(MailService,$state);
                this.service.selectedItem = {};

                $timeout(()=> {
                    this.getSelectedItem(this.service.selectedFolder, this.mailId);
                });


                this.mailFieldErrors = [
                    {type: "required", text: "Please enter a value for this field"},
                    {type: "email", text: "Enter a valid e-mail"}
                ];
            }

            get mail() {
                return this.item;
            }

            set mail(item) {
                this.item = item;
            }

            get isNew() {
                return this.mailId === undefined;
            }

            sendMail() {
                this.mail.date = new Date().getTime();
                this.service.sendMail(this.mail)
                    .then(response => {
                        this.service.selectedItem = null;
                        this.state.go("mailList", {folderName: this.service.selectedFolder});
                    })
                    .catch(error => console.log(error.message));
            }

            goToListState(){
                this.state.go("mailList", {folderName: this.service.selectedFolder}, {reload: 'mailList'});
            }
        }
    }
);

app.component("topNavList",
    {
        bindings: {
            navList: "<"
        },
        templateUrl: 'components/top-nav/top-nav-list.html',
        controller: function(){
        }
    }
);


app.component("topNavItem",
    {
        bindings: {
            navItem: "<"
        },
        templateUrl: 'components/top-nav/top-nav-itm.html',
        controller: function (ContactService,MailService) {
            //TODO:remove isActive,setSelectedPage from script and html
            /*this.isCurrentActive = () => {
             return this.isActive({itemName: this.navItem});
             };*/
            /*this.setCurrentSelectedPage = () => {
             this.setSelectedPage({itemName: this.navItem});
             }*/
            this.reset = function(){
                ContactService.selectedContact = null;
                MailService.selectedMail = null;
            }
        }
    }
);

app.component("contactPage",
    {
        bindings: {},
        templateUrl: 'components/contacts/contact-page.html',
        controller: function (ContactService) {
            this.isContactSelected = () => {
                return ContactService.selectedContact !== null;
            };
        }
    }
);

app.component("contactList",
    {
        bindings: {},
        templateUrl: 'components/contacts/contact-list.html',
        controller: class ContactListController extends ListController {
            constructor(ContactService,$timeout) {
                super(ContactService,$timeout);
            }

            get contacts() {
                return this.items;
            }

            set contacts(items) {
                this.items = items;
            }

            loadContacts() {
                this.service.getData().then((contacts) => {
                    this.contacts = contacts;
                });
            }

            loadItems() {
                return this.loadContacts();
            }

            setSelectedContact(contact) {
                this.setSelectedItem(contact);
            }
        }
    });

app.component("contactItem",
    {
        bindings: {
            contact: "<",
            setSelectedContact: "&"
        },
        templateUrl: 'components/contacts/contact-item.html',
        controller: function () {
        }
    }
);

app.component("contactView",
    {
        bindings: {
            contactId:"<"
        },
        templateUrl: 'components/contacts/contact-view.html',
        controller: class ContactViewController extends ViewController {
            constructor(ContactService,$state,$timeout) {
                super(ContactService,$state);
                $timeout(()=> {
                    if (this.service.selectedItem === null) {

                        this.getSelectedItem("users", this.contactId);

                    } else {
                        this.contact = this.service.selectedItem;
                    }
                    this.editMode = this.isNew ? true : false;
                });

                this.mailFieldErrors = [
                    {type: "required", text: "Please enter a value for this field"},
                    {type: "email", text: "Enter a valid e-mail"}
                ];

                this.nameFieldErrors = [
                    {type: "required", text: "Please enter a value for this field"},
                    {type: "minlength", text: "This field can be at least 5 characters long"}
                ];
            }

            get contact() {
                return this.item;
            }

            set contact(item) {
                this.item = item;
            }

            get isNew() {
                return this.contactId === undefined;
            }

            edit() {
                this.editMode = true;
            }

            save() {
                if (this.isNew) {
                    this.service.add(this.contact).then((response)=> {
                        //this.editMode = this.isNew = false;
                        //this.contactId
                        this.editMode = false;
                        this.state.go("contactView", {contactId:this.contact.id});
                    });
                } else {
                    this.service.update(this.contact).then((response)=> {
                        this.editMode = false;
                    });
                }
            }

            goToListState(){
                this.state.go("contacts", {reload: 'contacts'});
            }
        }
    });

app.directive('changeDateFormat', function () {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function (scope, element, attrs, ngModel) {

            //model -> view
            ngModel.$formatters.push(function (modelValue) {
                return new Date(modelValue);
            });

            //view -> model
            ngModel.$parsers.push(function (viewValue) {
                return viewValue ? viewValue.getTime() : viewValue;
            });
        }
    };
});

app.component("customButton",
    {
        bindings: {
            name: "<",
            class: "<",
            disabled: "<",
            sref:"<",
            clickHandler: "&"
        },
        templateUrl: 'components/components/button.html',
        controller: function () {
        }
    }
);

app.component("messages",
    {
        bindings: {
            element: "<",
            errors: "<",
            visibility: "<"
        },
        templateUrl: 'components/components/messages.html',
        controller: function ($timeout) {
            $timeout(()=> {
                    if (this.visibility === undefined) this.visibility = true;
                }
            );
        }
    }
);

class BaseService {
    constructor($http, UtilsService) {
        this.http = $http;
        this.utilsService = UtilsService;
    }

    getData(dataName = this.dataName) {
        return this.http.get(`${this.utilsService.baseURL}${dataName}.json`)
            .then(response => this.utilsService.normalizeToArray(response.data))
            .catch(error => console.log(error.message));
    }

    getSelectedItem(folderName, itemId){
        return this.http.get(`${this.utilsService.baseURL}${folderName.toLowerCase()}/${itemId}.json`)
    }

    add(newItem, dataName = this.dataName) {
        return this.http.post(`${this.utilsService.baseURL}${dataName}.json`, newItem)
            .then(
                response => {
                    newItem.id = response.data.name;
                    return newItem;
                })
            .catch(error => console.log(error.message));
    }

    update(item, dataName = this.dataName) {
        return this.http.put(`${this.utilsService.baseURL}${dataName}/${item.id}.json`, item)
            .then(response => response.data).
            catch(error => console.log(error.message));
    }

    remove(item, dataName = this.dataName) {
        return this.http.delete(`${this.utilsService.baseURL}${dataName}/${item.id}.json`)
            .then(response => response.data)
            .catch(error => console.log(error.message));
    }

    removeArray(arr, dataName = this.dataName) {
        let results = [];
        let i = 0;
        let length = arr.length;
        let removeNextItem = () => {
            return this.remove(arr[i], dataName)
                .then((response) => {
                    return (++i < length) ? removeNextItem() : true;
                })
                .catch(error => console.log(error.message));
        };
        return removeNextItem();
    }
}

app.service("MailService", class MailService extends BaseService {
    constructor($http, UtilsService) {
        super($http, UtilsService);
        this.selectedPage = null;
        this.selectedFolder = null;
        this.selectedMail = null;
    }

    getFolders() {
        return this.getData("folders");
    }

    getMails(folderName) {
        return this.getData(folderName.toLowerCase());
    }

    getSelectedItem(folderName, mailId) {
        return super.getSelectedItem(folderName, mailId)
            .then(response => {
                response.data.id = mailId;
                response.data.folder = folderName;
                return response.data;
            })
            .catch(error => console.log(error.message));
    }

    sendMail(mail) {
        return this.add(mail, "sent");
    }

    get selectedItem() {
        return this.selectedMail;
    }

    set selectedItem(mail) {
        this.selectedMail = mail;
    }

});

app.service("ContactService", class ContactService extends BaseService {
    constructor($http, UtilsService) {
        super($http, UtilsService);
        this.selectedContact = null;
        this.dataName = "users";
    }

    getSelectedItem(folderName,contactId) {
        return super.getSelectedItem(folderName, contactId)
            .then(response => {
                response.data.id = contactId;
                return response.data;
            })
            .catch(error => console.log(error.message));
    }

    get selectedItem() {
        return this.selectedContact;
    }

    set selectedItem(contact) {
        this.selectedContact = contact;
    }
});

app.service("UtilsService", function () {
    this.normalizeToArray = function (object) {
        if (!object) return [];
        return Object.keys(object).map(key => {
            let normalizedObject = object[key];
            normalizedObject.id = key;
            return normalizedObject;
        });
    };

    this.baseURL = "https://fiery-inferno-8968.firebaseio.com/";
});