import { Users } from "../models/users.model.js"
import { ApiError } from "../common/apiError.js"
import { ApiResponse } from "../common/apiResponse.js"
import uploadOnCloudinary from "../common/cloudinary.js"
import { asyncHandler } from "../common/asyncHandler.js";

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

export { registerUser, logIn, logOut };