import React, { useState, useEffect } from 'react';
import uuid from 'uuid/v4';
import awsconfig from '../aws-exports';
import { Storage, API, graphqlOperation } from 'aws-amplify';
import { createTodo } from '../graphql/mutations'
import { withAuthenticator } from 'aws-amplify-react'
import { listTodos } from '../graphql/queries';

// have not actually used Products anywhere as it wasn't working the S3 bucket as hoped. Didn't actually want to make the bucket public, which is why...


const {
    aws_user_files_s3_bucket_region: region,
    aws_user_files_s3_bucket: bucket
} = awsconfig


const Products = () => {
    const [file, updateFile] = useState(null);
    const [productName, updateProductName] = useState('');
    const [products, updateProducts] = useState([]);
    useEffect(() => {
        listProducts()
    }, [])


    const handleChange = event => {
        const { target: { value, files } } = event;
        const fileForUpload = files[0]
        updateProductName(fileForUpload.name.split('.')[0])
        updateFile(fileForUpload || value)
    }

    const addProduct = async () => {
        if (file) {
            const extension = file.name.split('.')[1];
            const { type: mimeType } = file;
            const key = `images/${uuid()}${productName}.${extension}`;
            const url = `https://${bucket}.s3.${region}.amazonaws.com/public/${key}`;
            const inputData = { name: productName, image: url }

            try {
                await Storage.put(key, file, {
                    contentType: mimeType
                })
                await API.graphql(graphqlOperation(createTodo, { input: inputData}))
            } catch (err) {
                console.log('error: ', err)
            }
        }
    }

    const listProducts = async () => {
        const products = await API.graphql(graphqlOperation(listTodos))
        updateProducts(products.data.listTodos.items)
    }

    return (
        
        <div>
            <input type='text' placeholder='Product Name' value={productName} onChange={event => updateProductName(event.target.value)}/>
            <input type='file' onChange={handleChange}/>
            <button onClick={addProduct}>Create Product</button>

            {products.map((product, index) => {
                console.log(product)
            return <img key={index} src={product.image} alt={product.name}/> }
            )}
        </div>
    )

}

export default withAuthenticator(Products)