export function PromisifyGrpc<TReq , TRes>(
  fn:(req: TReq , cb: (err:any , res:TRes) => void) => void
){
  return (req: TReq) => new Promise<TRes>((resolve , reject) => {
    fn(req , (err , res) => {
      if(err) reject(err)
      resolve(res)
    })
  })
}