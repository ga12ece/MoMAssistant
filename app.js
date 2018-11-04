/*-----------------------------------------------------------------------------
A simple Language Understanding (LUIS) bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    openIdMetadata: process.env.BotOpenIdMetadata 
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

/*----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot. 
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */

var tableName = 'botdata';
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);

// Create your bot with a function to receive messages from the user
// This default message handler is invoked if the user's utterance doesn't
// match any intents handled by other dialogs.
var bot = new builder.UniversalBot(connector, function (session, args) {
    session.send('You reached the default message handler. You said \'%s\'.', session.message.text);
});

bot.set('storage', tableStorage);

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v2.0/apps/' + luisAppId + '?subscription-key=' + luisAPIKey;

// Create a recognizer that gets intents from LUIS, and add it to the bot
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
bot.recognizer(recognizer);

const accountSid = 'AC65b0c6c589f19d723778b00e14e94120';
const authToken = '6c33f8ac218ee332c3c269d4f8903492';
var twilio = require('twilio');
var sms_client = new twilio(accountSid, authToken);

bot.dialog('GreetingDialog', [
    function(session){
        const getGreetings = require('./getGreeting.js');
        session.say(getGreetings());
        session.say('How can I help you today?');
    }
]).triggerAction({
    matches: 'hello'
})

bot.dialog('dielog', [
    function(session){
        session.say('Take it easy. Everything will be OK.');
        session.say('Tell me things make you worried. I think I am able to solve it');
        session.userData.die = true;
    }
]).triggerAction(
    {
        matches: 'die'
    }
)

bot.dialog('stresslog',
    function(session, args){
        var type_stress = builder.EntityRecognizer.findEntity(args.intent.entities, 'stress_source');
        session.send(type_stress);
        if (type_stress.entity == 'my husband'|| type_stress.entity == 'alone'){
            session.say('I think your husband are willing to help you. Open it to him will be a good way.');
            session.beginDialog('meeting');
            sms_client.messages.create(
            {
                to: '+17078197692',
                from: '+16203749788',
                body: 'Your wife just told me that she is really stress right now' 
            });      
        }
        if (type_stress == 'work'){
            session.say("Do you know that I can suggest some changes to make your plan more efficient.");
            session.beginDialog('make_plan');
        }
        if (type_stress == 'children'){
            session.beginDialog('children');
        }
    } 
).triggerAction({
    matches: 'stress'
})

bot.dialog('Food', 
    function (session, args){
        var intent = args.intent;
        var type_food = builder.EntityRecognizer.findEntity(intent.entities, 'foodsource');
        if (type_food.entity == 'blood'){
            session.beginDialog('blood');
        }
        else if (type_food.entity == 'vitamin a'){
            session.beginDialog('vitaminA');
        }
        else if (type_food.entity == 'vitamin d'){
            session.beginDialog('vitaminD');
        }
        else{
            session.beginDialog('genFood');
        }
}).triggerAction({
    matches: 'childfood' 
})

bot.dialog('vitaminA',[
    function(session){
        session.say('Here are several dishes that increase your health');
        builder.prompt.choice(session, 'Please select one of them', "spaghetti")   
    }, 
    function(session, result){
        var dish = result.response.entity;
        if (dish == 'spaghetti'){
            
        }
        if (dish == 'meatball'){
            
        }
    }
])

bot.dialog('notsleep', [
    function(session){
        session.say("Oh. You dont have a good sleep");
        builder.Prompts.number(session, 'How many times did you lose your sleep this week? Please enter number ');
    },
    function (session, results){
        var timeSleep = results.response;
        if (timeSleep >= 5){
            session.say("I'm so sorry to hear that. You know that sleeping is really important to you and to your babies.");
            session.say("I think I can help you to manage your current schedule so you can have more time to sleep.");
            session.beginDialog('make_plan');
            sms_client.messages.create({
                to: '+17078197692',
                from:'+16203749788',
                body: "Recently, your wife hasn't slept well. You should take care for her."
            })
        }
        else{
            session.say('Don’t worry! 66 to 94% of women report sleep disturbances during pregnancy.');
            session.say('I suggest you try these methods to improve it. Follow this [link](https://www.parents.com/baby/new-parent/sleep-deprivation/8-ways-to-combat-new-moms-sleep-troubles/)');
        }
    }
]).triggerAction({
    matches: 'notsleep'
})

bot.dialog('plan',[
    function(session){
        session.say('Besides that do you have a good plan per day?');
        builder.Prompts.choice('Besides that, do you have a good plan per day',"Yes|No",  { listStyle: builder.ListStyle.button });
    }, function(session, results){
        switch (results.response.index){
            case 0:
                session.userData.plan = true;
                session.beginDialog('strict');
                break;
            case 1:
                session.userData.plan = false;
                session.beginDialog('make_plan');
                break;
            default:
                session.endDialog();
                break;
        }
    }
])

bot.dialog('strict',[
    function(session){
        session.say("That's good to know.");
        builder.Prompts.choice("Do you ever feel that your plan is too strict?","Yes|No", { listStyle: builder.ListStyle.button });
    }, function(session, result){
        switch (result.response.index){
            case 0:
                session.userData.strict = true;
                break;
            
            case 1:
                session.userData.strict = false;
                break;
            
            default:
                session.endDialog();
                break;
        }
        session.beginDialog('make_plan');
    }
])

bot.dialog('make_plan', [
    function(session){
        session.say('In your current schedule, do you have any free time for yourself');
    }
])

bot.dialog('meeting', [
    function(session){
        session.say('Besides husband and family, you can seek out to other woman group.');
        builder.Prompts.choice('Do you know any woman group? Actually, I can look up for you.','Yes|No',  { listStyle: builder.ListStyle.button });
    },
    function(session, results){
        switch (results.response.index){
            case 0:
                session.say("That's good to know. Trying to reach out with others is definetely a good way");
                session.beginDialog('plan');
                break;
            
            case 1:
                session.say("Ok. No problem");
                

        }
    }
    
])

bot.dialog('endConversation',
    (session) => {
        const ends = require('./end.js');
        session.send(ends());
        session.endDialog();
    }
).triggerAction({
    matches: 'end'
})
