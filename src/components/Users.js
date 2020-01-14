import React, { useState, useReducer, useEffect } from 'react';
import awsconfig from '../aws-exports';
import uuid from 'uuid/v4'
import { Storage, API, graphqlOperation, Auth } from 'aws-amplify'
import { createUser as CreateUser } from '../graphql/mutations'
import { listUsers } from '../graphql/queries';
import { onCreateUser } from '../graphql/subscriptions'
import { withAuthenticator } from 'aws-amplify-react'

const {
    aws_user_files_s3_bucket_region: region,
    aws_user_files_s3_bucket: bucket
} = awsconfig

const initialState = {
    users: []
}

const reducer = (state, action) => {
    switch(action.type) {
        case 'SET_USERS':
            return { ...state, users: action.users }
        case 'ADD_USER':
            return { ...state, users: [action.user, ...state.users] }
        default:
            return state;
    }
}

const Users = () => {
    const [file, updatedFile] = useState(null)
    const [username, updateUsername] = useState('')
    const [state, dispatch] = useReducer(reducer, initialState)
    const [avatarUrl, updateAvatarUrl] = useState('')

    const handleChange = event => {
        const { target: { value, files } } = event
        const [image] = files || []
        updatedFile(image || value)
    }

    const createUser = async () => {
        if (!username) return alert('please enter a username')
        
        if (file && username) {
            const { name: fileName, type: mimeType } = file;
            const key = `${uuid()}${fileName}}`
            const fileForUpload = {
                bucket,
                key,
                region
            }
            const inputData = { username, avatar: fileForUpload }

            try {
                await Storage.put(key, file, {
                    contentType: mimeType
                })
                await API.graphql(graphqlOperation(CreateUser, { input: inputData }))
                updateUsername('')
                console.log('successfully stored user data!!')
            } catch (err) {
                console.log('error: ', err)
            }
        }
    }

    const fetchUsers = async () => {
        try {
            let users = await API.graphql(graphqlOperation(listUsers))
            users = users.data.listUsers.items
            dispatch({ type: 'SET_USERS', users })
        } catch (err) {
            console.log('error: ', err)
        }
    }

    useEffect(() => {
        fetchUsers()
        const subscription = API.graphql(graphqlOperation(onCreateUser)).subscribe({
            next: async userData => {
                const { onCreateUser } = userData.value.data
                dispatch({ type: 'ADD_USER', user: onCreateUser})
            }
        })
        return () => subscription.unsubscribe()
    }, [])

    const fetchImage = async (key) => {
        try {
            await Storage.get(key).then(imageData => {
                return updateAvatarUrl(imageData)})
            
        } catch(err) {
            console.log('error: ', err)
        }
    }

    const handleSignOut = () => {
        Auth.signOut().then(() => {'Sign Out Successful!'}).catch(err => console.log('error: ', err))
    }

    
    return(
        <div>
            <input label='File to upload' type='file' onChange={handleChange} />
            <input placeholder='username' value={username} onChange={event => {updateUsername(event.target.value)}}/>
            <button onClick={createUser}>Save Image for User</button>

            {state.users.map((user, index) => {
                return (
                    <div key={index}>
                       
                        <p onClick={() => fetchImage(user.avatar.key)}>{user.username}</p>
                    </div>
                )
            })}
            <img src={avatarUrl} alt={username}/>
            
            
            <button onClick={handleSignOut}>Sign Out</button>
            
        </div>
    )
}

export default withAuthenticator(Users)