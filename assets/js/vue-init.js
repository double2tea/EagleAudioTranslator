// Vue 初始化脚本
document.addEventListener('DOMContentLoaded', function() {
    // 等待 Vue 加载完成
    if (typeof Vue === 'undefined') {
        console.error('Vue 未加载');
        return;
    }

    // 创建 Vue 应用
    const app = Vue.createApp({
        data() {
            return {
                darkMode: false,
                activeStep: 1,
                // 其他数据...
            };
        },
        methods: {
            // 切换主题
            toggleTheme() {
                this.darkMode = !this.darkMode;
                document.body.classList.toggle('dark-theme', this.darkMode);
                // 保存主题设置到本地存储
                localStorage.setItem('darkMode', this.darkMode ? 'true' : 'false');
            },
            // 设置活动步骤
            setActiveStep(step) {
                this.activeStep = step;
                // 更新步骤指示器
                document.querySelectorAll('.step').forEach((el, index) => {
                    if (index + 1 < step) {
                        el.classList.add('completed');
                        el.classList.remove('active');
                    } else if (index + 1 === step) {
                        el.classList.add('active');
                        el.classList.remove('completed');
                    } else {
                        el.classList.remove('active', 'completed');
                    }
                });
            }
        },
        mounted() {
            // 从本地存储加载主题设置
            const savedDarkMode = localStorage.getItem('darkMode');
            if (savedDarkMode === 'true') {
                this.darkMode = true;
                document.body.classList.add('dark-theme');
            }

            // 绑定主题切换按钮
            const themeToggle = document.getElementById('themeToggle');
            if (themeToggle) {
                themeToggle.addEventListener('click', () => {
                    this.toggleTheme();
                });
            }

            // 绑定步骤点击事件
            document.querySelectorAll('.step').forEach((el, index) => {
                el.addEventListener('click', () => {
                    const stepNumber = index + 1;
                    // 只允许点击已完成的步骤或下一个步骤
                    if (stepNumber <= this.activeStep || stepNumber === this.activeStep + 1) {
                        this.setActiveStep(stepNumber);
                    }
                });
            });

            console.log('Vue 应用已初始化');
        }
    });

    // 挂载 Vue 应用
    app.mount('#app');
});
