import { ApiError } from "../common/apiError";
import { asyncHandler } from "../common/asyncHandler";
import { Users } from "../models/users.model";


export const verifyJWT = asyncHandler(async(req, res, next) => {

    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

    if (!token){
        throw new ApiError(401, "Unauthorized Request")
    }

    try {
        const decoded = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        const user = await Users.findById(decoded?.uniqueId).select("-password -refreshToken")

        if (!user) {
            throw new ApiError(401, "Invalid Access Token")
        }

        req.user = user
        next()

    } catch (error) {
        throw new ApiError(401, "Unauthorized Request")
    }

})