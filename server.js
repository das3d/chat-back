const express = require('express')

const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)
app.use(express.json())
app.use(express.urlencoded({extended:true}))

const rooms = new Map() //create collection-replacing the data base

app.get('/rooms/:id', (req, res) => {
    const {id: roomId} = req.params
    /*Users and messages from this room are returned by the requested roomID
    If there is no room, then empty arrays are returned
    */
    const obj = rooms.has(roomId)?{
        users: [...rooms.get(roomId).get('users').values()],
        messages: [...rooms.get(roomId).get('messages').values()]
    }:{users:[], messages: []}

    res.json(obj)
})

app.post('/rooms', (req, res) => {
        const {roomId} = req.body
    //If there is no room with the required id, it's created
        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Map([
                ['users', new Map()],
                ['messages', []],
            ]),)
        }
        res.json(roomId);

    }
)
io.on('connection', (socket) => {
    socket.on('ROOM:JOIN', ({roomId, userName}) => {
        socket.join(roomId)//connecting user to a room
        rooms.get(roomId).get('users').set(socket.id, userName)//reccording a user in this room
        const users = [...rooms.get(roomId).get('users').values()]//creting an array of the users in this rooms
        socket.broadcast.to(roomId).emit('ROOM:JOINED', users)//send on client array of users
    })
    console.log('user connect', socket.id)

    socket.on('ROOM:NEW__MESSAGE', ({roomId, userName, text, date})=>{
        const obj = {
            userName, text, date
        }
        rooms.get(roomId).get('messages').push(obj)// write new message to the database
        socket.to(roomId).emit('ROOM:NEW__MESSAGE', obj)//return new message on client
    })
    socket.on('CLIENT:ROOM:CALL',({userName, roomId, signal})=>{

        socket.to(roomId).emit('SERVER:ROOM:CALL',{ userName, signal})
        //sending the main peer signal to all peers in this room
    })
    socket.on('CLIENT:ROOM:ANSWER',({roomId, targetUserName, inSignal})=>{
        socket.to(roomId).emit('SERVER:ROOM:ANSWER',{targetUserName, inSignal})
        //sending the main peer answer to all peers in this room
    })
    socket.on('disconnect', ()=>{
        //disconnecting from sockets when user leave the room
        rooms.forEach((value, roomId)=>{

            if(value.get('users').delete(socket.id)){
                const users = [...rooms.get(roomId).get('users').values()]
                socket.to(roomId).emit('ROOM:LEAVE', users)}
        })

    })

})

server.listen(8888, () => {
    console.log("Server was started")
})