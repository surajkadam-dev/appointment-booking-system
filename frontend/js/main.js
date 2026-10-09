document.addEventListener("DOMContentLoaded", () => {

    /*
     * Landing page currently has no backend data.
     * All real customer, staff, service and appointment
     * information will be loaded after authentication.
     */

    const navigationLinks = document.querySelectorAll(
        ".main-navigation a"
    );

    navigationLinks.forEach((link) => {

        link.addEventListener("click", () => {

            navigationLinks.forEach((item) => {
                item.classList.remove("active");
            });

            link.classList.add("active");
        });

    });


    /*
     * Keep the navigation state updated while
     * the user scrolls through the landing page.
     */

    const sections = document.querySelectorAll(
        "main section[id]"
    );

    const updateActiveNavigation = () => {

        const scrollPosition =
            window.scrollY + 150;

        sections.forEach((section) => {

            const sectionTop = section.offsetTop;

            const sectionBottom =
                sectionTop + section.offsetHeight;

            const sectionId = section.getAttribute("id");

            const navigationLink =
                document.querySelector(
                    `.main-navigation a[href="#${sectionId}"]`
                );

            if (!navigationLink) {
                return;
            }

            if (
                scrollPosition >= sectionTop &&
                scrollPosition < sectionBottom
            ) {

                navigationLinks.forEach((item) => {
                    item.classList.remove("active");
                });

                navigationLink.classList.add("active");
            }

        });

    };


    window.addEventListener(
        "scroll",
        updateActiveNavigation,
        { passive: true }
    );

});