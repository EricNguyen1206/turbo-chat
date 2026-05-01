"use client";

// External libraries
import React, { useRef, useState } from "react";

// Third-party utilities
import { toast } from "react-toastify";

// Icons
import { User } from "lucide-react";

// Helpers
// Helpers
import { useUpload } from "@/hooks/useUpload";

// UI components
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";

// API
import { useCurrentUserQuery, useUpdateProfileMutation } from "@/services/api/users";
import { useQueryClient } from "@tanstack/react-query";
import { UpdateProfileDto } from '@turbo-chat/validators';

type ParentComponentProps = {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const UserSettingDialog: React.FC<ParentComponentProps> = ({ children, open, onOpenChange }) => {
  // Store/state/hooks
  const { data: profile } = useCurrentUserQuery();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<any>({
    username: "",
    password: "",
    currentPassword: "",
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [image, setImage] = useState<any>(null);
  const avatarRef = useRef<any>(null);

  // API hooks
  const updateProfileMutation = useUpdateProfileMutation();
  const { uploadFile } = useUpload();
  // Reset form

  const handleImageSelection = (event: any) => {
    setImage(event.target.files[0]);
  };

  // Async event handlers
  const handleEditUserProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.currentPassword) {
      toast.error("Current password is required");
      return;
    }

    let avatar = null;
    let checkEdit = false;

    const updateData: UpdateProfileDto = {
      currentPassword: formData.currentPassword,
    };

    // Check edit avatar
    if (image !== null) {
      setLoading(true);

      const res = await uploadFile(image, "avatars");

      if (res === null) {
        // toast error already handled in hook
        setLoading(false);
        return;
      }

      // Create avatar url
      avatar = res.publicUrl;
      updateData.avatar = avatar;
      checkEdit = true;
    }

    // Check other fields
    if (formData.username && formData.username.trim() !== "") {
      updateData.username = formData.username.trim();
      checkEdit = true;
    }

    if (formData.password && formData.password.trim() !== "") {
      updateData.password = formData.password.trim();
      checkEdit = true;
    }

    if (!checkEdit) {
      toast.error("Please make at least one change");
      setLoading(false);
      return;
    }

    if (!loading) setLoading(true); // Ensure loading is true if not set by upload logic

    try {
      await updateProfileMutation.mutateAsync(updateData);
      toast.success("Profile updated successfully");
      // Invalidate and refetch user query to get updated data
      queryClient.invalidateQueries({ queryKey: ["user", "current"] });
      setLoading(false);
      onOpenChange?.(false);
    } catch (error) {
      setLoading(false);
      // Error handling is done in mutation onError callback
    }
  };

  // Render
  return (
    <Dialog open={open ?? false} onOpenChange={onOpenChange ?? (() => { })}>
      <DialogTrigger asChild>
        <div>{children}</div>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User size={20} />
            Edit Profile
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <Avatar className="w-20 h-20">
            <AvatarImage src={profile?.avatar} alt="avatar" />
            <AvatarFallback className="text-2xl">
              {profile?.username && profile.username[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="text-center">
            <p className="font-semibold text-lg">{profile?.username}</p>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
          </div>
        </div>

        <form onSubmit={handleEditUserProfile} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">New Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter new username (optional)"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar">New Avatar</Label>
            <Input id="avatar" type="file" accept="image/*" ref={avatarRef} onChange={handleImageSelection} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter new password (optional)"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password *</Label>
            <Input
              id="currentPassword"
              type="password"
              placeholder="Enter current password (required)"
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Updating..." : "Update Profile"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserSettingDialog;
