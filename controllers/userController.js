import { Users } from "../models/users.model.js"
import { ApiError } from "../common/apiError.js"
import { ApiResponse } from "../common/apiResponse.js"
import uploadOnCloudinary from "../common/cloudinary.js"
import { asyncHandler } from "../common/asyncHandler.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {

    try {
        
        const user = await Users.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating token")
    }

}

const registerUser = asyncHandler( async (req, res) => {
    
    const { fullName, email, userName, password } = req.body;

    if (
        [fullName, email, userName, password].some((val) => {
            val === ""
        })
    ) {
        return new ApiError(400, "All fields are required")
    }

    const existedUser = await Users.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatar){
        return new ApiError(400, "avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email, 
        password,
        userName: userName.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

} )

const logIn = asyncHandler( async(req, res) => {

    const { userName, email, password } = req.body;

    if (!(userName || email)) {
        throw new ApiError(400, "userName or Email is required.")
    }

    const user = await Users.findOne(
        { $or: [ { userName }, { email } ] }
    )

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    const isPasswordCorrect = await user.isPasswordCorrect(password)
    
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid login credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await Users.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {
                    user: loggedInUser, accessToken: accessToken, refreshToken: refreshToken
                },
                "User logged in successfully"
            )
        )

} )

const logOut = asyncHandler( async (req, res) => {

    await Users.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        self: true
    }

    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(
            new ApiResponse(
                200, 
                {},
                "User logged out successfully"
            )
        )

} )

const refreshAccessToken = asyncHandler( async (req, res) => {
    
    try {
        const { refreshToken } = req.cookies.refreshToken || req.body.refreshToken
    
        if (!refreshToken) {
            throw new ApiError(401, "Unauthenticated request")
        }
    
        const decodedToken = jwt.verify(
            refreshToken, 
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await Users.findById(decodedToken?.uniqueId)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (refreshToken !== user.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const {accessToken, newRefreshtoken} = await generateAccessAndRefreshToken(user._id)
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshtoken, options)
        .json(
            new ApiResponse(
                200, 
                {
                    accessToken: accessToken, refreshToken: newRefreshtoken
                },
                "Access token refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

const updateUserProfile = asyncHandler( async(req, res) => {

    try {
        
        const { fullName, email } = req.body;

        if (!(fullName || email)){
            throw new ApiError(400, "All fields are required")
        }

        const user = await Users.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    fullName,
                    email
                }
            },
            {
                new: true
            }
        ).select("-password")

        return res.status(200).json(
            new ApiResponse(
                200, 
                user,
                "User profile updated successfully"
            )
        )

    } catch (error) {
        throw new ApiError(401, error?.message)
    }

})

const changePassword = asyncHandler( async(req, res) => {

    try {

        const { oldPassword, newPassword } = req.body;
        
        const user = await Users.findById(req.user._id)

        const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

        if (!isPasswordCorrect) {
            throw new ApiError(400, "Invalid old password")
        }

        user.password = newPassword
        await user.save({validateBeforeSave: true})
        
        return res.status(200).json(
            new ApiResponse(
                200, 
                {},
                "Password changed successfully"
            )
        )

    } catch (error) {
        throw new ApiError(401, error?.message)
    }

})

const getCurrentUser = asyncHandler(async(req, res) => {
    try {

        return res.status(200).json(
            new ApiResponse(
                200, 
                req.user,
                "Success"
            )
        )

    } catch (error) {
        throw new ApiError(401, error?.message)
    }
})

const updateUserAvatar = asyncHandler(async(req, res) => {
    try {

        const avatarLocalPath = req.file?.avatar[0]?.path

        if (!avatarLocalPath) {
            throw new ApiError(400, "Avatar file is required")
        }

        const avatar = await uploadOnCloudinary(avatarLocalPath)

        if (!avatar) {
            throw new ApiError(400, "Error while uploading avatar")
        }

        const user = await Users.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    avatar: avatar.url
                }
            },
            {
                new: true
            }
        ).select("-password")

        return response.status(200).json(
            new ApiResponse(
                200, 
                user,
                "Avatar updated successfully"
            )
        )

    } catch (error) {
        throw new ApiError(401, error?.message)
    }
})

const updateUserCover = asyncHandler(async(req, res) => {
    try {

        const coverLocalPath = req.file?.coverImage[0]?.path

        if (!coverLocalPath) {
            throw new ApiError(400, "cover image file is required")
        }

        const coverImage = await uploadOnCloudinary(coverLocalPath)

        if (!coverImage) {
            throw new ApiError(400, "Error while uploading cover image file")
        }

        const user = await Users.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    coverImage: coverImage.url
                }
            },
            {
                new: true
            }
        ).select("-password")

        return response.status(200).json(
            new ApiResponse(
                200, 
                user,
                "cover image updated successfully"
            )
        )

    } catch (error) {
        throw new ApiError(401, error?.message)
    }
})

export {
    registerUser,
    logIn,
    logOut,
    refreshAccessToken,
    updateUserProfile,
    changePassword,
    getCurrentUser,
    updateUserAvatar,
    updateUserCover
};
