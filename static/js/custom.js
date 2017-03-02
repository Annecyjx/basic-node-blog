$(document).ready(function(){
	console.log('loaded the dom');
	$("button").click(function(event){
		var postId = $('.postId').attr('id')
		console.log(postId)
		event.preventDefault()
		userInput = $('#body').val()
		$.post('/specpost', {magic:userInput, postId: postId}, function(data){
			console.log('performed post request')
			console.log(data.magic)
			$('#result-box').append('<p>' + data.magic + '</p>');
		})
	})

})


