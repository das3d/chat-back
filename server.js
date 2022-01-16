const express = require('express')

const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)
app.use(express.json())
app.use(express.urlencoded({extended:true}))

const rooms = new Map()

app.get('/rooms/:id', (req, res) => {
    const {id: roomId} = req.params
    const obj = rooms.has(roomId)?{
        users: [...rooms.get(roomId).get('users').values()],
        messages: [...rooms.get(roomId).get('messages').values()]
    }:{users:[], messages: []}

    res.json(obj)
})

app.post('/rooms', (req, res) => {
        const {roomId, userName} = req.body
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
        socket.join(roomId)
        rooms.get(roomId).get('users').set(socket.id, userName)
        const users = [...rooms.get(roomId).get('users').values()]
        socket.to(roomId).emit('ROOM:JOINED', users)
    })
    console.log('user connect', socket.id)

    socket.on('ROOM:NEW__MESSAGE', ({roomId, userName, text, date})=>{
        const obj = {
            userName, text, date
        }
        rooms.get(roomId).get('messages').push(obj)
        socket.to(roomId).emit('ROOM:NEW__MESSAGE', obj)
    })
    socket.on('disconnect', ()=>{
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