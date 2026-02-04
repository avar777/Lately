// Global state
let currentPostId = null;
let currentPhotos = [];
let userHasLiked = false;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadFeed();
    setupDragAndDrop();
});

// Password check for upload
function checkPassword() {
    const password = prompt('Enter password to upload:');
    if (password) {
        openUploadModal(password);
    }
}

// Load photo feed
async function loadFeed() {
    const loading = document.getElementById('loading');
    const emptyState = document.getElementById('emptyState');
    const photoGrid = document.getElementById('photoGrid');
    
    loading.style.display = 'block';
    emptyState.style.display = 'none';
    photoGrid.innerHTML = '';
    
    try {
        const response = await fetch(API_ENDPOINTS.getFeed);
        const data = await response.json();
        
        loading.style.display = 'none';
        
        if (data.success && data.posts.length > 0) {
            currentPhotos = data.posts;
            renderPhotos(data.posts);
        } else {
            emptyState.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading feed:', error);
        loading.style.display = 'none';
        alert('Failed to load photos. Please check your API endpoints in config.js');
    }
}

// Render photos in grid with smart masonry layout
function renderPhotos(posts) {
    const photoGrid = document.getElementById('photoGrid');
    photoGrid.innerHTML = '';
    
    // Determine number of columns based on screen width
    const getColumnCount = () => {
        if (window.innerWidth >= 900) return 4;
        if (window.innerWidth >= 600) return 3;
        return 2;
    };
    
    const columnCount = getColumnCount();
    
    // Create column containers
    const columns = [];
    for (let i = 0; i < columnCount; i++) {
        const column = document.createElement('div');
        column.className = 'masonry-column';
        columns.push(column);
        photoGrid.appendChild(column);
    }
    
    // Distribute photos across columns (row-reverse makes rightmost column appear first)
    posts.forEach((post, index) => {
        const card = document.createElement('div');
        card.className = 'photo-card';
        
        card.innerHTML = `
            <img src="${post.imageUrl}" alt="${post.caption}" class="photo-image">
        `;
        
        card.addEventListener('click', () => openPhotoDetail(post));
        
        // Fill columns left to right in code (row-reverse flips them visually)
        const columnIndex = index % columnCount;
        columns[columnIndex].appendChild(card);
    });
    
    // Re-render on window resize
    let resizeTimeout;
    window.removeEventListener('resize', window.handleResize);
    window.handleResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            renderPhotos(posts);
        }, 250);
    };
    window.addEventListener('resize', window.handleResize);
}

// Store password temporarily for upload session
let uploadPassword = null;

// Modal functions
function openUploadModal(password) {
    uploadPassword = password;
    document.getElementById('uploadModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeUploadModal() {
    document.getElementById('uploadModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    uploadPassword = null;
    
    // Reset form
    document.getElementById('fileInput').value = '';
    document.getElementById('captionInput').value = '';
    document.getElementById('previewImage').style.display = 'none';
    document.getElementById('uploadPlaceholder').style.display = 'block';
}

function openPhotoDetail(post) {
    currentPostId = post.postId;
    
    document.getElementById('modalImage').src = post.imageUrl;
    document.getElementById('modalCaption').textContent = post.caption || '';
    document.getElementById('modalDate').textContent = new Date(post.timestamp).toLocaleString();
    
    // Update like button state and count
    const likeButton = document.getElementById('likeButton');
    const likeIcon = document.getElementById('likeIcon');
    const likeCount = document.getElementById('likeCount');
    
    likeCount.textContent = post.likeCount;
    
    // Check if user has already liked this post
    const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '[]');
    userHasLiked = likedPosts.includes(post.postId);
    
    if (userHasLiked) {
        likeIcon.textContent = '♥';
        likeIcon.style.color = '#ffc2d1';
        likeButton.classList.add('liked');
    } else {
        likeIcon.textContent = '♡';
        likeIcon.style.color = '#262626';
        likeButton.classList.remove('liked');
    }
    
    // Render comments with delete buttons
    const commentsList = document.getElementById('commentsList');
    commentsList.innerHTML = '';
    
    if (post.comments && post.comments.length > 0) {
        post.comments.forEach((comment, index) => {
            const commentDiv = document.createElement('div');
            commentDiv.className = 'comment';
            commentDiv.setAttribute('data-comment-index', index);
            commentDiv.innerHTML = `
                <div class="comment-content">
                    <div class="comment-text">${comment.text}</div>
                    <button class="delete-comment-btn" onclick="deleteComment('${comment.timestamp}', ${index})" title="Delete comment">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                </div>
            `;
            commentsList.appendChild(commentDiv);
        });
    }
    
    // Hide comment form initially
    document.getElementById('commentForm').style.display = 'none';
    document.getElementById('commentInput').value = '';
    
    document.getElementById('photoModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closePhotoModal() {
    document.getElementById('photoModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    currentPostId = null;
    userHasLiked = false;
}

function openCommentInput() {
    const commentForm = document.getElementById('commentForm');
    const commentInput = document.getElementById('commentInput');
    
    commentForm.style.display = 'block';
    commentInput.focus();
}

function cancelComment() {
    document.getElementById('commentForm').style.display = 'none';
    document.getElementById('commentInput').value = '';
}

// File handling with compression
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        // Compress and show preview
        compressImage(file, (compressedDataUrl) => {
            document.getElementById('previewImage').src = compressedDataUrl;
            document.getElementById('previewImage').style.display = 'block';
            document.getElementById('uploadPlaceholder').style.display = 'none';
        });
    }
}

// Compress image to reduce file size
function compressImage(file, callback, maxWidth = 1920, maxHeight = 1920, quality = 0.85) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Calculate new dimensions while maintaining aspect ratio
            if (width > height) {
                if (width > maxWidth) {
                    height = height * (maxWidth / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = width * (maxHeight / height);
                    height = maxHeight;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to JPEG with quality compression
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            callback(compressedDataUrl);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Drag and drop
function setupDragAndDrop() {
    const uploadArea = document.getElementById('uploadArea');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.add('drag-over');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.remove('drag-over');
        }, false);
    });
    
    uploadArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                document.getElementById('fileInput').files = dataTransfer.files;
                
                // Compress and show preview
                compressImage(file, (compressedDataUrl) => {
                    document.getElementById('previewImage').src = compressedDataUrl;
                    document.getElementById('previewImage').style.display = 'block';
                    document.getElementById('uploadPlaceholder').style.display = 'none';
                });
            }
        }
    }, false);
}

// Upload photo with compression
async function uploadPhoto() {
    const fileInput = document.getElementById('fileInput');
    const caption = document.getElementById('captionInput').value;
    const uploadButton = document.getElementById('uploadButton');
    
    if (!fileInput.files[0]) {
        alert('Please select a photo first!');
        return;
    }
    
    if (!uploadPassword) {
        alert('No password provided');
        return;
    }
    
    uploadButton.disabled = true;
    uploadButton.textContent = 'Compressing...';
    
    try {
        const file = fileInput.files[0];
        
        // Compress the image before uploading
        compressImage(file, async (compressedDataUrl) => {
            uploadButton.textContent = 'Uploading...';
            
            try {
                const response = await fetch(API_ENDPOINTS.uploadPhoto, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        image: compressedDataUrl,
                        caption: caption,
                        password: uploadPassword
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert('✨ Photo uploaded successfully!');
                    closeUploadModal();
                    loadFeed();
                } else {
                    if (data.error === 'Invalid password') {
                        alert('Incorrect password!');
                    } else {
                        alert('Failed to upload photo: ' + (data.error || 'Unknown error'));
                    }
                }
            } catch (error) {
                console.error('Error uploading photo:', error);
                alert('Failed to upload photo. Please try again.');
            } finally {
                uploadButton.disabled = false;
                uploadButton.textContent = 'Upload';
            }
        }, 1920, 1920, 0.85); // Max 1920px, 85% quality
        
    } catch (error) {
        console.error('Error processing photo:', error);
        alert('Failed to process photo. Please try again.');
        uploadButton.disabled = false;
        uploadButton.textContent = 'Upload';
    }
}

// Delete photo
async function deletePhoto() {
    if (!currentPostId) return;
    
    const password = prompt('Enter password to delete this photo:');
    if (!password) return;
    
    if (!confirm('Are you sure you want to delete this photo? This cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(API_ENDPOINTS.deletePhoto, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                postId: currentPostId,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Photo deleted successfully!');
            closePhotoModal();
            loadFeed();
        } else {
            if (data.error === 'Invalid password') {
                alert('Incorrect password!');
            } else {
                alert('Failed to delete photo: ' + (data.error || 'Unknown error'));
            }
        }
    } catch (error) {
        console.error('Error deleting photo:', error);
        alert('Failed to delete photo. Please try again.');
    }
}

// Delete comment
async function deleteComment(timestamp, index) {
    if (!currentPostId) return;
    
    const password = prompt('Enter password to delete this comment:');
    if (!password) return;
    
    const currentPost = currentPhotos.find(p => p.postId === currentPostId);
    if (!currentPost || !currentPost.comments[index]) {
        alert('Comment not found');
        return;
    }
    
    try {
        const response = await fetch(API_ENDPOINTS.deleteComment, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                postId: currentPostId,
                commentSK: `COMMENT#${timestamp}`,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const commentElement = document.querySelector(`[data-comment-index="${index}"]`);
            if (commentElement) {
                commentElement.remove();
            }
            currentPost.comments.splice(index, 1);
        } else {
            if (data.error === 'Invalid password') {
                alert('Incorrect password!');
            } else {
                alert('Failed to delete comment: ' + (data.error || 'Unknown error'));
            }
        }
    } catch (error) {
        console.error('Error deleting comment:', error);
        alert('Failed to delete comment. Please try again.');
    }
}

// Like photo
async function likePhoto() {
    if (!currentPostId) return;
    
    // Check if user has already liked
    if (userHasLiked) {
        return; // Already liked, do nothing
    }
    
    try {
        const response = await fetch(API_ENDPOINTS.addLike, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                postId: currentPostId,
                username: 'User' + Date.now() // Make each like unique
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const likeIcon = document.getElementById('likeIcon');
            const likeButton = document.getElementById('likeButton');
            const likeCount = document.getElementById('likeCount');
            
            likeIcon.textContent = '♥';
            likeIcon.style.color = '#ffc2d1';
            likeButton.classList.add('liked');
            userHasLiked = true;
            
            // Save to localStorage
            const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '[]');
            likedPosts.push(currentPostId);
            localStorage.setItem('likedPosts', JSON.stringify(likedPosts));
            
            const currentCount = parseInt(likeCount.textContent);
            likeCount.textContent = currentCount + 1;
            
            likeIcon.style.transform = 'scale(1.3)';
            setTimeout(() => {
                likeIcon.style.transform = 'scale(1)';
            }, 300);
        }
    } catch (error) {
        console.error('Error adding like:', error);
    }
}

// Add comment
async function addComment() {
    if (!currentPostId) return;
    
    const commentText = document.getElementById('commentInput').value.trim();
    
    if (!commentText) {
        alert('Please enter a comment!');
        return;
    }
    
    try {
        const response = await fetch(API_ENDPOINTS.addComment, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                postId: currentPostId,
                username: 'User',
                text: commentText
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const commentsList = document.getElementById('commentsList');
            
            const commentDiv = document.createElement('div');
            commentDiv.className = 'comment';
            const timestamp = data.comment.timestamp;
            const newIndex = commentsList.children.length;
            commentDiv.setAttribute('data-comment-index', newIndex);
            commentDiv.innerHTML = `
                <div class="comment-content">
                    <div class="comment-text">${commentText}</div>
                    <button class="delete-comment-btn" onclick="deleteComment('${timestamp}', ${newIndex})" title="Delete comment">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                </div>
            `;
            commentsList.appendChild(commentDiv);
            
            // Add the new comment to currentPhotos array
            const currentPost = currentPhotos.find(p => p.postId === currentPostId);
            if (currentPost) {
                if (!currentPost.comments) {
                    currentPost.comments = [];
                }
                currentPost.comments.push({
                    text: commentText,
                    timestamp: timestamp,
                    username: 'User'
                });
            }
            
            document.getElementById('commentInput').value = '';
            document.getElementById('commentForm').style.display = 'none';
            
            commentsList.scrollTop = commentsList.scrollHeight;
        } else {
            alert('Failed to add comment');
        }
    } catch (error) {
        console.error('Error adding comment:', error);
        alert('Failed to add comment. Please try again.');
    }
}

// Close modals on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeUploadModal();
        closePhotoModal();
        cancelComment();
    }
});

// Swipe to close photo modal with visual feedback
let touchStartY = 0;
let touchEndY = 0;
let isDragging = false;
let modalContent = null;

document.addEventListener('DOMContentLoaded', () => {
    const photoModal = document.getElementById('photoModal');
    
    if (photoModal) {
        photoModal.addEventListener('touchstart', (e) => {
            // Only track if touching the modal overlay or photo (not the sidebar)
            if (e.target.classList.contains('modal-overlay') || 
                e.target.classList.contains('modal-photo') ||
                e.target.tagName === 'IMG') {
                touchStartY = e.changedTouches[0].screenY;
                isDragging = true;
                modalContent = document.querySelector('.modal-content.modal-photo');
                if (modalContent) {
                    modalContent.style.transition = 'none';
                }
            }
        }, { passive: true });

        photoModal.addEventListener('touchmove', (e) => {
            if (!isDragging || !modalContent) return;
            
            const currentY = e.changedTouches[0].screenY;
            const diff = currentY - touchStartY;
            
            // Only allow downward swipes
            if (diff > 0) {
                const opacity = Math.max(0.3, 1 - (diff / 500));
                modalContent.style.transform = `translateY(${diff}px)`;
                modalContent.style.opacity = opacity;
            }
        }, { passive: true });

        photoModal.addEventListener('touchend', (e) => {
            if (!isDragging || !modalContent) return;
            
            touchEndY = e.changedTouches[0].screenY;
            const swipeDistance = touchEndY - touchStartY;
            
            modalContent.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
            
            // If swiped down enough, close the modal
            if (swipeDistance > 100) {
                modalContent.style.transform = 'translateY(100%)';
                modalContent.style.opacity = '0';
                setTimeout(() => {
                    closePhotoModal();
                    if (modalContent) {
                        modalContent.style.transform = '';
                        modalContent.style.opacity = '';
                        modalContent.style.transition = '';
                    }
                }, 300);
            } else {
                // Snap back to original position
                modalContent.style.transform = '';
                modalContent.style.opacity = '';
            }
            
            isDragging = false;
        }, { passive: true });
    }
});

function handleSwipe() {
    const swipeDistance = touchEndY - touchStartY;
    const swipeThreshold = 100;
    
    if (swipeDistance > swipeThreshold) {
        closePhotoModal();
    }
}