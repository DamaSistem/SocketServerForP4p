var fetch = require ("node-fetch");
var questionsUrl = 'https://s1.damasistem.com/euplay/';

const myFetch = async (questionType)=>{
	const response = await fetch(questionsUrl+questionType, {method: 'POST', body: 'a=1'});
	const data = await response.json();
	return data;
}

const selectRandomMultipleChoiseQuestions = async()=>{
	var questions = [];

	questions = await myFetch("questions_multiple_en.json");
	
	return questions.splice(Math.random()*(questions.length-1+1),1).pop();;
}

const selectRandomTrueFalseQuestions = async()=>{
	var questions = [];

	questions = await myFetch("questions_truefalse_en.json");
	
	return questions.splice(Math.random()*(questions.length-1+1),1).pop();;
}

const selectRandomFillintheBlankQuestions = async()=>{
	var questions = [];

	questions = await myFetch("questions_fillinthebalnk_en.json");
	
	return questions.splice(Math.random()*(questions.length-1+1),1).pop();;
}

const selectRandomMatchingQuestions = async()=>{
	var questions = [];

	questions = await myFetch("questions_matching_en.json");
	
	return questions.splice(Math.random()*(questions.length-1+1),1).pop();;
}

const selectRandomOrderingQuestions = async()=>{
	var questions = [];

	questions = await myFetch("questions_ordering_en.json");
	
	return questions.splice(Math.random()*(questions.length-1+1),1).pop();;
}

const selectRandomMapQuestions = async()=>{
	var questions = [];

	questions = await myFetch("questions_map_en.json");
	
	return questions.splice(Math.random()*(questions.length-1+1),1).pop();;
}

const SelectQuestionWithType = async (questionType)=>{
	if(questionType == "multiple")
		return await selectRandomMultipleChoiseQuestions();
	else if(questionType == "trueFalse")
		return await selectRandomTrueFalseQuestions();	
	else if(questionType == "fillintheBlank")
		return await selectRandomFillintheBlankQuestions();	
	else if(questionType == "matching")
		return await selectRandomMatchingQuestions();
	else if(questionType == "ordering")
		return await selectRandomOrderingQuestions();
	else//"map"
		return await selectRandomMapQuestions();
	
}
module.exports = {SelectQuestionWithType}