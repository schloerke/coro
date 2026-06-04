library(shiny)
library(shinyreact)

ui <- page_react_html("www/index.html")

server <- function(input, output, session) {
  # live-demo wiring added in a later task
}

shinyApp(ui, server)
