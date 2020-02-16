export interface Iresults {
    placeResult?: AWS.S3.ManagedUpload.SendData,
    statusResult?: AWS.S3.ManagedUpload.SendData,
    succeedResult?: AWS.S3.ManagedUpload.SendData,
    errorResult?: AWS.S3.ManagedUpload.SendData,
}