import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudnary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken }

  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating refresh and access token")
  }
}

const registerUser = asyncHandler(async (req, res) => {
  // Get user details from frontend
  const { fullName, email, username, password } = req.body;
  // console.log("email", email);

  // Validate required fields
  if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  // Check if the user already exists
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User already exists");
  }

  // Check and upload images to Cloudinary
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  // const coverImageLocalPath = req.files?.cover?.[0]?.path;
  let coverImageLocalPath;
  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  const avatar = await uploadOnCloudnary(avatarLocalPath);
  const coverImage = coverImageLocalPath ? await uploadOnCloudnary(coverImageLocalPath) : null;

  if (!avatar) {
    throw new ApiError(400, "Avatar upload failed");
  }

  // Create user in DB
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // Fetch user without sensitive fields
  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // Send response
  return res.status(201).json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // req.bidy se data
  // username or email 
  // find the user
  // if user exists then return user
  //password check
  // access and refresh token
  // send Cookies

  const { email, username, password } = req.body;
  if (!username && !email) {
    throw new ApiError(400, "Username or password is required");
  }
  // if(!( username || email)){
  //   throw new ApiError(400, "Username or password is required");
  // }
  const user = await User.findOne({
    $or: [{ email }, { username }],
  })
  if (!user) {
    throw new ApiError(404, "Users not exist");
  }
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

  const loggedInUser = await User.findById(user._id).select("-password, -refreshToken")

  const option = {
    httpOnly: true,
    secure: true
  }
  return res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken, option)
    .json(
      new ApiResponse(200, {
        user: loggedInUser,
        accessToken: accessToken,
        refreshToken: refreshToken
      }, "User logged in successfully")
    )
})

const logoutUser = asyncHandler((req, res) => {
  User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1 // this removes thr field from document
      }
    }, {
    new: true
  }
  )
  const option = {
    httpOnly: true,
    secure: true
  }
  return res
    .status(200)
    .clearCookie("accessToken", option)
    .clearCookie("refreshToken", option)
    .json(
      new ApiResponse(200, {}, "User logged out successfully")
    )
})

const refreshToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request")
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET
    )

    const user = await User.findById(decodedToken?._id)
    if (!user) {
      throw new ApiError(404, "Users not exist");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired");
    }
    const option = {
      httpOnly: true,
      secure: true
    }
    const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id)
    return res
      .status(200)
      .cookie("accessToken", accessToken, option)
      .cookie("refreshToken", newRefreshToken, option)
      .json(
        new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Access token refreshed")
      )
  } catch (error) {
    throw new ApiError(401, error?.message || "invalid refresh token")
  }

})

const changeCurrentPasswod = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body

  const user = await User.findById(req.user?._id)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password")
  }
  user.password = newPassword
  await user.save({ validateBeforeSave: false })
  return res.status(200)
    .json(
      new ApiResponse(200, { message: "Password changed" }, "Password changed")
    )

})
const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200)
    .json(new ApiResponse(200, req.user, "current User fetched successfully"))

})

const updateAccountDetail = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!fullName || !email) {
    throw new ApiError(400, "Please fill all fields");
  }
  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: fullName,
        email: email
      }
    },
    { new: true }
  ).select("-password")

  return res.status(200)
    .json(
      new ApiResponse(200, { message: "Account details updated" }, "Account details updated")
    )
})

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Please upload a file");
  }
  const avatar = await uploadOnCloudnary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(400, "Failed to upload avatar");
  }
  const user = await User.findByIdAndUpdate(req.user?._id, {
    $set: {
      avatar: avatar.url
    }
  },
    { new: true }
  ).select("-password")
  return res.status(200)
    .json(new ApiResponse(200, { message: "Avatar updated" }, "Avatar updated"))
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Please upload a file");
  }
  const coverImage = await uploadOnCloudnary(coverImageLocalPath);
  if (!coverImage || !coverImage.url) {
    throw new ApiError(400, "Failed to upload avatar");
  }
  const user = await User.findByIdAndUpdate(req.user?._id, {
    $set: {
      coverImage: coverImage.url
    }
  },
    { new: true }
  ).select("-password")
  return res.status(200)
    .json(new ApiResponse(200, { message: "Cover image updated" }, "Cover image"))

})

const getUserProfileDetails = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "Please provide a username");
  }
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      }

    }, {
      $lookup: {
        from: 'subscriptions',
        localField: '_id',
        foreignField: 'channel',
        as: "subscribers"
      }
    }, {
      $lookup: {
        from: 'subscriptions',
        localField: '_id',
        foreignField: 'subscriber',
        as: "subscribeTo"
      }
    }, {
      $addFields: {
        subscribersCount: { $size: "$subscribers" },
        channelsSubscribedToCount: { $size: "$subscribeTo" },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false
          }
        }
      }
    }, {
      $project: {
        fullname: 1,
        username: 1,
        avatar: 1,
        coverImage: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        email: 1,
      }

    }
  ])
  if (!channel?.length) {
    throw new ApiError(404, "channel des not exist")
  }
  return res.status(200)
    .json(
      new ApiResponse(200, channel[0], "user chanelled fetched successfully")
    )

})

const getWatchHistory = asyncHandler(async (req, res) => {

  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id)
        
      }
    }, {
      $lookup: {
        from: 'videos',
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [{
          $lookup: {
            from: 'users',
            localField: 'owner',
            foreignField: '_id',
            as: "owner",
            pipeline:[
              {
                $project:{
                  fullname:1,
                  username:1,
                  avatar:1
                }
              }
            ]
          }
        },
        {
          $addFields:{
            owner:{$first:"$owner"}
          }
        }
      ]
      }
    }
  ])
  if(!user || user.length === 0){
    throw new ApiError(404, "user does not exist")
  }
  return res.status(200)
  .json(new ApiResponse(200,user[0].watchHistory,"watch history fetched successfully"))
})


export { registerUser, loginUser, logoutUser, refreshToken, changeCurrentPasswod, getCurrentUser, updateAccountDetail, updateUserAvatar, updateUserCoverImage, getUserProfileDetails ,getWatchHistory};
