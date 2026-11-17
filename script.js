// DATA/API: URL ของ Google Apps Script สำหรับอ่านผลงานและส่งฟอร์มไปยัง Google Sheets
// ที่เก็บข้อมูลอยู่บนบริการภายนอก ไม่ได้เก็บฐานข้อมูลไว้ในไฟล์ HTML นี้
const GOOGLE_SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbz2uHrMEyZV0OJkNKCe6vMx8zGIOh84rN1Lf1Xk3Svtd1vY4yQOAGu8_XzDUEqd4HYYdQ/exec';

// JavaScript state: เก็บข้อมูลผลงานและสถานะรูปภาพของ Modal
let loadedProjects = [];
let currentImageIndex = 0;
let currentProjectImages = [];

// JavaScript helper: แปลงลิงก์ Google Drive ให้เป็น URL สำหรับแสดงรูปภาพ
function formatImageUrl(url) {
    if (!url) return 'https://placehold.co/600x400/ea580c/ffffff?text=No+Image';

    if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
        let fileId = '';

        const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match1 && match1[1]) {
            fileId = match1[1];
        }

        const match2 = url.match(/id=([a-zA-Z0-9_-]+)/);
        if (!fileId && match2 && match2[1]) {
            fileId = match2[1];
        }

        if (fileId) {
            return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
        }
    }

    return url;
}

// JavaScript helper: แยก URL รูปภาพหลายรายการจากข้อมูลที่ได้จาก API
function parseImageUrls(urlStr) {
    if (!urlStr) return ['https://placehold.co/600x400/ea580c/ffffff?text=No+Image'];
    const urls = String(urlStr).split(/[\n,]+/).map(url => url.trim()).filter(Boolean);
    if (urls.length === 0) return ['https://placehold.co/600x400/ea580c/ffffff?text=No+Image'];
    return urls.map(formatImageUrl);
}

// JavaScript/UI: แสดงสถานะกำลังโหลดผลงาน
function renderLoading() {
    const container = document.getElementById('projects-container');
    container.className = 'flex flex-col items-center justify-center col-span-full py-16 text-center';
    container.innerHTML = `
        <div class="relative w-16 h-16 mb-4">
            <div class="w-16 h-16 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin"></div>
        </div>
        <p class="text-gray-600 font-medium text-lg animate-pulse">กำลังโหลดข้อมูลผลงาน...</p>
        <p class="text-gray-400 text-sm mt-1">กรุณารอสักครู่</p>
    `;
}

// JavaScript/UI: แสดงสถานะเมื่อไม่มีข้อมูลหรือโหลดข้อมูลไม่สำเร็จ
function renderEmpty(message = 'ยังไม่มีข้อมูลผลงานในขณะนี้') {
    const container = document.getElementById('projects-container');
    container.className = 'flex flex-col items-center justify-center col-span-full py-16 text-center';
    container.innerHTML = `
        <div class="w-20 h-20 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mb-4 text-3xl">
            📁
        </div>
        <p class="text-gray-700 font-semibold text-xl mb-1">${message}</p>
        <p class="text-gray-500 text-sm max-w-md">เชื่อมต่อ Google Sheets API URL เพื่อดึงข้อมูลกิจกรรมและผลงานของคุณมาแสดงผลที่นี่</p>
    `;
}

// JavaScript/API: ขอข้อมูลผลงานจาก Google Apps Script แล้วส่งต่อให้ฟังก์ชันแสดงผล
async function fetchProjects() {
    renderLoading();

    if (!GOOGLE_SHEET_API_URL) {
        setTimeout(() => {
            renderEmpty('กรุณาระบุ Google Sheets API URL');
        }, 500);
        return;
    }

    try {
        const response = await fetch(GOOGLE_SHEET_API_URL);
        const data = await response.json();

        if (data && Array.isArray(data) && data.length > 0) {
            loadedProjects = data.map(project => {
                const images = parseImageUrls(project.image);
                return {
                    ...project,
                    images: images,
                    image: images[0]
                };
            });
            renderProjects(loadedProjects);
        } else {
            renderEmpty('ไม่พบข้อมูลผลงาน');
        }
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google Sheets:', error);
        renderEmpty('ไม่สามารถเชื่อมต่อเพื่อดึงข้อมูลได้');
    }
}

// JavaScript/UI: สร้างการ์ดผลงานและแทรกลงในพื้นที่ HTML
function renderProjects(projects) {
    const container = document.getElementById('projects-container');
    container.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10';
    container.innerHTML = projects.map(project => `
        <article class="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group border border-gray-100 flex flex-col h-full">
            <div class="h-56 overflow-hidden relative bg-gray-100">
                <img src="${project.image}" alt="${project.title || 'ผลงาน'}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" onerror="this.onerror=null; this.src='https://placehold.co/600x400/ea580c/ffffff?text=Image+Error';">
                <div class="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-orange-600 uppercase tracking-wider">
                    ${project.category || 'ทั่วไป'}
                </div>
            </div>
            <div class="p-8 flex flex-col flex-grow">
                <h3 class="text-xl font-bold text-gray-900 mb-3 group-hover:text-orange-500 transition-colors">${project.title || 'ไม่มีชื่อหัวข้อ'}</h3>
                <p class="text-gray-600 text-sm mb-6 line-clamp-3 leading-relaxed flex-grow">
                    ${project.description || ''}
                </p>
                <button onclick="openProjectModal(${project.id})" class="inline-flex items-center text-orange-600 hover:text-orange-700 font-semibold text-sm group/btn focus:outline-none">
                    ดูรูปภาพ/รายละเอียดเพิ่มเติม
                    <svg class="w-4 h-4 ml-1 transform group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                </button>
            </div>
        </article>
    `).join('');
}

// JavaScript/Modal: เปลี่ยนรูปภาพและตัวนับในหน้าต่างรายละเอียดผลงาน
function updateModalImage(index) {
    if (!currentProjectImages || currentProjectImages.length === 0) return;

    if (index < 0) {
        currentImageIndex = currentProjectImages.length - 1;
    } else if (index >= currentProjectImages.length) {
        currentImageIndex = 0;
    } else {
        currentImageIndex = index;
    }

    const modalImage = document.getElementById('modal-img');
    modalImage.src = currentProjectImages[currentImageIndex];
    modalImage.onerror = function() {
        this.src = 'https://placehold.co/600x400/ea580c/ffffff?text=Image+Error';
    };

    const counter = document.getElementById('modal-img-counter');
    if (counter && currentProjectImages.length > 1) {
        counter.textContent = `${currentImageIndex + 1} / ${currentProjectImages.length}`;
    }
}

// JavaScript/Modal: เลื่อนรูปภาพในแกลเลอรี
function prevModalImage() {
    updateModalImage(currentImageIndex - 1);
}

function nextModalImage() {
    updateModalImage(currentImageIndex + 1);
}

// JavaScript/Modal: เตรียมข้อมูลและเปิดหน้าต่างรายละเอียดผลงาน
function openProjectModal(id) {
    const project = loadedProjects.find(item => item.id == id);
    if (!project) return;

    currentProjectImages = project.images && project.images.length > 0 ? project.images : [project.image];
    currentImageIndex = 0;

    const previousButton = document.getElementById('modal-prev-btn');
    const nextButton = document.getElementById('modal-next-btn');
    const counter = document.getElementById('modal-img-counter');

    if (currentProjectImages.length > 1) {
        previousButton?.classList.remove('hidden');
        nextButton?.classList.remove('hidden');
        counter?.classList.remove('hidden');
    } else {
        previousButton?.classList.add('hidden');
        nextButton?.classList.add('hidden');
        counter?.classList.add('hidden');
    }

    updateModalImage(0);

    document.getElementById('modal-title').textContent = project.title;
    document.getElementById('modal-category').textContent = project.category || 'รายละเอียดกิจกรรม';
    document.getElementById('modal-full-desc').textContent = project.fullDescription || project.description;

    const modal = document.getElementById('project-modal');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.remove('opacity-0'), 10);
    document.body.style.overflow = 'hidden';
}

// JavaScript/Modal: ปิดหน้าต่างรายละเอียดผลงาน
function closeProjectModal() {
    const modal = document.getElementById('project-modal');
    modal.classList.add('opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }, 300);
}

// JavaScript event: รองรับปุ่มลูกศรเพื่อเลื่อนรูป และ Escape เพื่อปิด Modal
window.addEventListener('keydown', event => {
    const modal = document.getElementById('project-modal');
    if (modal && !modal.classList.contains('hidden')) {
        if (event.key === 'ArrowLeft') {
            prevModalImage();
        } else if (event.key === 'ArrowRight') {
            nextModalImage();
        } else if (event.key === 'Escape') {
            closeProjectModal();
        }
    }
});

// JavaScript/UI: เปิดและปิดเมนูนำทางบนมือถือ
const mobileMenuButton = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });
}

// JavaScript/API: ส่งข้อมูลจาก Contact Form ไปยัง Google Apps Script/Google Sheets
async function handleFormSubmit(event) {
    event.preventDefault();

    const submitButton = document.getElementById('submit-btn');
    const originalButtonContent = submitButton.innerHTML;

    submitButton.disabled = true;
    submitButton.innerHTML = `
        <svg class="animate-spin h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>กำลังส่งข้อความ...</span>
    `;

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const message = document.getElementById('message').value;

    try {
        const formData = new URLSearchParams();
        formData.append('action', 'contact');
        formData.append('name', name);
        formData.append('email', email);
        formData.append('message', message);
        formData.append('timestamp', new Date().toLocaleString('th-TH'));

        await fetch(GOOGLE_SHEET_API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString()
        });

        const modal = document.getElementById('status-modal');
        if (modal) {
            modal.classList.remove('hidden');
            setTimeout(() => modal.classList.remove('opacity-0'), 10);
        }

        document.getElementById('contact-form')?.reset();
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการส่งข้อความ:', error);
        alert('เกิดข้อผิดพลาดในการส่งข้อความ กรุณาลองใหม่อีกครั้ง');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonContent;
    }
}

// JavaScript/Modal: ปิดหน้าต่างแจ้งผลการส่งฟอร์ม
function closeModal() {
    const modal = document.getElementById('status-modal');
    if (modal) {
        modal.classList.add('opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

// JavaScript entry point: โหลดข้อมูลผลงานเมื่อเอกสาร HTML พร้อมใช้งาน
window.addEventListener('DOMContentLoaded', fetchProjects);