const JANDAN_USER_INFO = "JANDAN_USER_INFO"
const storage = weex.requireModule('storage')
const html = weex.requireModule('html')
import config from '../config'
import stream from './jandan-stream'
var userInfo = {author:'',email:''}
var jokeVoteMaps = {}
storage.getItem(JANDAN_USER_INFO,(res)=>{
	if(res.result == 'success') {
		userInfo = JSON.parse(res.data)
	}
})
storage.getItem('jokeVoteMaps',(res)=>{
	if(res.result == 'success') {
		jokeVoteMaps = JSON.parse(res.data)
	}
})

module.exports = {
	comments(url, page){
		return new Promise((resolve) => {
			setTimeout(()=>{
				if(!page) {
					this.request(url).then((html)=>{
						this.commentsMaxPage(html).then((page)=>{
							page = page.trim()
							this.commentsList(html).then((result)=>{
								resolve({maxPage:page,datalist:result.comments, postId:result.postId})
							})
						})
					})
				} else {
					this.request(url + "/page-"+page+"#comments").then((html)=>{
						this.commentsList(html).then((result)=>{
							resolve({datalist:result.comments, postId:result.postId})
						})
					})
				}
			},300)
		})
	},
	commentsList(htmlString){
		return new Promise((resolve)=>{
			var result = {
				postId:'',
				comments:[]
			}
			html.css(htmlString, '.current-post', (find) => {
				html.parse(find[0], (parse) => {
					result.postId = parse.id
				})
			})
			html.css(htmlString,'.commentlist .row',(find) =>{
				const datalist = []
				find.forEach((value) => {
					const obj = {}
					html.css(value,'.author strong',(find) => {
						html.parse(find[0], (parse) => {
							obj['author'] = parse.text
						})
					})
					html.css(value,'.author small',(find) => {
						html.parse(find[0], (parse) => {
							obj['time'] = parse.text
						})
					})
					
					html.css(value,'.text p',(find) => {
						html.parse(find[0], (parse) => {
							obj['title'] = parse.text
						})
					})
					html.css(value,'.righttext a',(find) => {
						html.parse(find[0], (parse) => {
							obj['id'] = parse.text
						})
					})
					
					html.css(value,'.jandan-vote span',(find) => {
						html.parse(find[1], (parse) => {
							obj['support'] = parse.text
						})
						html.parse(find[3], (parse) => {
							obj['unsupport'] = parse.text
						})
					})
					datalist.push(obj)
				})
				setTimeout(()=>{
					result.comments = datalist;
					resolve(result)
				},200)
			})
		})
	},
	commentsMaxPage(htmlString){
		return new Promise((resolve) =>{
			html.css(htmlString,'.current-comment-page',(find) =>{
				if(find.length > 0) {
					html.parse(find[0], function(data) {
						var maxPage = data.text.replace('[', '')
						maxPage = maxPage.replace(']', '')
						resolve(maxPage)
					})
				} else {
					resolve('1')
				}
			})
		})
	},
	getCommentCount(url){
		return new Promise((resolve, reject) => {
			stream.fetch({
				method: 'GET',
				url: url,
				cache:true,
				type: 'text'
			}, function(ret) {
				html.css(ret.data,'#comments', find =>{
					if(find.length > 0) {
						html.parse(find[0], parse => {
							let start = parse.text.indexOf(':') + 1;
							let end = parse.text.indexOf('+');
							let count = parse.text.substring(start,end)
							resolve(parseInt(count))
						})
					} else {
						resolve(0)
					}
				})
			})
		})
	},
	request(url){
		return new Promise((resolve) =>{
			stream.fetch({
				method: 'GET',
				url: url,
				type: 'text'
			}, function(ret) {
				resolve(ret.data)
			})
		})
	},
	submitComment(postId,comment, type){
		if(type == 'comment') {
			return new Promise((resolve,reject) => {
				const param = {
					author:userInfo.author,
					email:userInfo.email,
					comment:comment,
					comment_post_ID:postId
				}
				stream.fetch({
					method: 'POST',
					url: 'http://jandan.net/jandan-comment.php',
					type: 'json',
					body:config.toParams(param)
				}, (ret) => {
					resolve(ret.data)
				})
			})
		} else {
			return new Promise((resolve,reject) => {
				const param = {
					author:userInfo.author,
					email:userInfo.email,
					content:comment,
					comment_id:postId
				}
				stream.fetch({
					method: 'POST',
					url: 'http://jandan.net/jandan-tucao.php',
					type: 'json',
					body:config.toParams(param)
				}, (ret) => {
					resolve(ret.data)
				})
			})
		}
	},
	vote(jokeId, voteType){
		jokeVoteMaps[jokeId] = voteType
		storage.setItem('jokeVoteMaps',JSON.stringify(jokeVoteMaps))
		return new Promise((resolve)=>{
			var body;
			if(voteType == 1) {
				body = "comment_id="+jokeId+"&like_type=pos&data_type=comment"
			} else {
				body = "comment_id="+jokeId+"&like_type=neg&data_type=comment"
			}
			stream.fetch({
				method: 'POST',
				url: 'http://jandan.net/jandan-vote.php',
				type: 'json',
				body:body
			}, (ret) => {
				resolve(ret.data)
			})
		})
	},
	setUserInfo(author,email){
		userInfo.author = author
		userInfo.email = email
		storage.setItem(JANDAN_USER_INFO,JSON.stringify(userInfo))
	},
	getUserInfo(){
		return new Promise((resolve)=>{
			storage.getItem(JANDAN_USER_INFO,(res)=>{
				if(res.result == 'success') {
					userInfo = JSON.parse(res.data)
				}
				resolve(userInfo)
			})
		})
	}
}
