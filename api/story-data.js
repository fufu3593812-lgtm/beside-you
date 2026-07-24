// Node natively supports require() for JSON files
var STORIES = require('./story-data.json');
var CARD_STORIES = {"\u6492\u5a07":{rarity:"SSR\uff08\u9650\u5b9a\uff09",storyTitle:"Coquetry",story:"\u7c89\u96fe\u91cc\u5979\u662f\u4e00\u9897\u8fd8\u6ca1\u54ac\u4e0b\u53bb\u7684\u679c\u5b9e\u3002"},"\u751f\u6c14":{rarity:"SSR\uff08\u9650\u5b9a\uff09",storyTitle:"Wrath",story:"\u6709\u4e00\u5ea7\u56fe\u4e66\u9986\uff0c\u6bcf\u4e00\u672c\u4e66\u53ea\u6709\u4e00\u9875\u3002"}};
module.exports = { STORIES: STORIES, CARD_STORIES: CARD_STORIES };
